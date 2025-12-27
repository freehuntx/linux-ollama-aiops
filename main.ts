#!/usr/bin/env -S deno run -A

interface LogSource {
  name: string;
  command: string[];
  description: string;
  critical: boolean;
  preprocess?: (content: string) => string;
}

interface HealthCheckResult {
  source: string;
  status: "healthy" | "warning" | "critical";
  summary: string;
  details: string;
  rawSample?: string;
  issues?: string[];
}

class SystemHealthChecker {
  private apiUrl: string;
  private apiKey: string;
  private model: string;
  private verbose: boolean;
  private logSources: LogSource[] = [
    {
      name: "dmesg-errors",
      command: ["dmesg", "-T", "-l", "err,crit,alert,emerg", "--since", "1hour ago"],
      description: "Kernel ring buffer errors (hardware, drivers, kernel panics)",
      critical: true,
      preprocess: (content: string) => {
        // Filter out common non-critical messages
        return content.split('\n')
          .filter(line => !line.includes("ACPI: button") && 
                         !line.includes("systemd-logind") &&
                         line.trim().length > 0)
          .slice(-50) // Last 50 lines
          .join('\n');
      }
    },
    {
      name: "dmesg-warnings",
      command: ["dmesg", "-T", "-l", "warn", "--since", "2hours ago"],
      description: "Kernel warnings (USB issues, filesystem warnings, etc)",
      critical: false,
      preprocess: (content: string) => content.split('\n').slice(-30).join('\n')
    },
    {
      name: "kernel-crashes",
      command: ["journalctl", "-k", "-p", "0..3", "-n", "50", "--no-pager", "--since", "24hours ago"],
      description: "Kernel crashes, panics, and critical errors",
      critical: true
    },
    {
      name: "disk-health",
      command: ["bash", "-c", "df -h | grep -E '^/dev/' && echo '---SMART---' && (smartctl -H /dev/sda 2>/dev/null || echo 'SMART not available')"],
      description: "Disk usage and SMART status",
      critical: true,
      preprocess: (content: string) => {
        // Add percentage warnings
        const lines = content.split('\n');
        return lines.map(line => {
          const match = line.match(/(\d+)%/);
          if (match && parseInt(match[1]) > 85) {
            return `⚠️ ${line} [HIGH USAGE]`;
          }
          return line;
        }).join('\n');
      }
    },
    {
      name: "memory-pressure",
      command: ["bash", "-c", "free -h && echo '---' && vmstat 1 2 | tail -1"],
      description: "Memory usage and swap activity",
      critical: true
    },
    {
      name: "io-errors",
      command: ["bash", "-c", "journalctl -n 30 --no-pager --since '2hours ago' | grep -iE '(I/O error|read error|write error|medium error|sector|SMART)'"],
      description: "I/O and disk errors from system logs",
      critical: true
    },
    {
      name: "systemd-failures",
      command: ["systemctl", "--failed", "--no-pager", "--no-legend"],
      description: "Failed systemd services",
      critical: false
    },
    {
      name: "network-errors",
      command: ["bash", "-c", "ip -s link | grep -A5 -E 'errors|dropped|overrun' | head -20"],
      description: "Network interface errors and drops",
      critical: false
    },
    {
      name: "temperature",
      command: ["bash", "-c", "sensors 2>/dev/null || echo 'sensors not installed'"],
      description: "CPU and system temperatures",
      critical: false
    },
    {
      name: "oom-killer",
      command: ["journalctl", "-n", "20", "--no-pager", "--grep", "Out of memory", "--since", "7days ago"],
      description: "Out of Memory killer activity",
      critical: true
    },
    {
      name: "security-audit",
      command: ["bash", "-c", "journalctl -n 30 --no-pager --since '6hours ago' | grep -iE '(failed password|authentication failure|unauthorized|break-in|POSSIBLE BREAK-IN)'"],
      description: "Security-related events and authentication failures",
      critical: false
    },
    {
      name: "process-crashes",
      command: ["bash", "-c", "journalctl -n 30 --no-pager --since '6hours ago' | grep -iE '(segfault|core dumped|crashed|signal 11|signal 6)'"],
      description: "Application crashes and segmentation faults",
      critical: false
    }
  ];

  constructor(apiUrl = "http://localhost:11434/v1", model = "qwen3:8b", apiKey = "", verbose = false) {
    this.apiUrl = apiUrl;
    this.model = model;
    this.apiKey = apiKey;
    this.verbose = verbose;
  }

  private async executeCommand(command: string[]): Promise<string> {
    try {
      const cmd = new Deno.Command(command[0], {
        args: command.slice(1),
        stdout: "piped",
        stderr: "piped",
      });

      const { stdout, stderr, success } = await cmd.output();
      
      if (!success) {
        const errorText = new TextDecoder().decode(stderr);
        // Some commands fail but still provide useful output
        const outputText = new TextDecoder().decode(stdout);
        if (outputText.trim()) {
          return outputText;
        }
        return `Error: ${errorText}`;
      }

      return new TextDecoder().decode(stdout);
    } catch (error) {
      return `Failed: ${error.message}`;
    }
  }

  private async analyzeWithLLM(source: LogSource, logContent: string): Promise<HealthCheckResult> {
    const systemPrompt = `You are an expert Linux system administrator analyzing system logs.

IMPORTANT INSTRUCTIONS:
1. Look for specific problems like:
   - Hardware failures or errors
   - Resource exhaustion (disk, memory, CPU)
   - Service failures or crashes
   - Security issues
   - Performance degradation
   - I/O errors or filesystem issues

2. Be SPECIFIC about what you find. Include:
   - Exact error messages
   - Affected components
   - Timestamps if available
   - Severity assessment

3. Respond ONLY with valid JSON using this exact format:
{
  "status": "healthy|warning|critical",
  "summary": "One-line summary of findings",
  "details": "Detailed explanation with specific error messages and implications",
  "issues": ["List", "of", "specific", "issues", "found"]
}

Status levels:
- "healthy": No issues or only informational messages
- "warning": Issues that need attention but system is functional
- "critical": Serious problems requiring immediate action

Do not include markdown formatting (like \`\`\`json) in the response. Return raw JSON only.`;

    const userPrompt = `Analyze these ${source.name} logs carefully and identify any issues.

Log Type: ${source.name}
Description: ${source.description}

Logs to analyze:
${logContent.substring(0, 4000)}

Respond with JSON only:`;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ],
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      try {
        const responseContent = data.choices[0].message.content;
        const analysis = JSON.parse(responseContent);
        return {
          source: source.name,
          status: analysis.status || "warning",
          summary: analysis.summary || "Analysis completed",
          details: analysis.details || "No additional details",
          issues: analysis.issues || [],
          rawSample: this.verbose ? logContent.substring(0, 200) : undefined
        };
      } catch (parseError) {
        return {
          source: source.name,
          status: "warning",
          summary: "Analysis completed with parsing issues",
          details: data.choices[0].message.content.substring(0, 500),
          issues: ["LLM response parsing failed"],
        };
      }
    } catch (error) {
      return {
        source: source.name,
        status: "warning",
        summary: "LLM analysis failed",
        details: `Error: ${error.message}`,
        issues: ["Could not analyze with LLM"],
      };
    }
  }

  private async checkApiConnection(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {};
      
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.apiUrl}/models`, { headers });
      if (!response.ok) return false;
      
      const data = await response.json();
      
      // Check if the model exists in the list
      // The response format may vary, try to handle both OpenAI and Ollama formats
      const models = data.data || data.models || [];
      const hasModel = models.some((m: any) => {
        const modelId = m.id || m.name || "";
        return modelId === this.model || modelId.startsWith(`${this.model}:`);
      });
      
      if (!hasModel && models.length > 0) {
        console.log(`⚠️  Model '${this.model}' not found. Available models:`);
        models.forEach((m: any) => {
          const modelId = m.id || m.name || "";
          console.log(`   - ${modelId}`);
        });
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  private formatStatus(status: string): string {
    const icons = {
      healthy: "✅",
      warning: "⚠️ ",
      critical: "🔴",
    };
    return icons[status as keyof typeof icons] || "❓";
  }

  private printDetailedResults(results: HealthCheckResult[]) {
    console.log("\n" + "=".repeat(70));
    console.log("📊 SYSTEM HEALTH CHECK DETAILED REPORT");
    console.log("=".repeat(70));
    console.log(`🕐 Timestamp: ${new Date().toLocaleString()}`);
    console.log(`🖥️  Hostname: ${Deno.hostname()}`);
    console.log("=".repeat(70));

    const grouped = {
      critical: results.filter(r => r.status === "critical"),
      warning: results.filter(r => r.status === "warning"),
      healthy: results.filter(r => r.status === "healthy"),
    };

    // Critical Issues Section
    if (grouped.critical.length > 0) {
      console.log("\n" + "─".repeat(70));
      console.log("🔴 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION");
      console.log("─".repeat(70));
      
      grouped.critical.forEach((r, index) => {
        console.log(`\n${index + 1}. ${r.source.toUpperCase()}`);
        console.log(`   Status: ${this.formatStatus(r.status)} CRITICAL`);
        console.log(`   Summary: ${r.summary}`);
        console.log(`   Details: ${r.details}`);
        
        if (r.issues && r.issues.length > 0) {
          console.log(`   Specific Issues Found:`);
          r.issues.forEach(issue => console.log(`     • ${issue}`));
        }
        
        if (this.verbose && r.rawSample) {
          console.log(`   Raw Log Sample:`);
          console.log(`     ${r.rawSample.replace(/\n/g, '\n     ')}`);
        }
      });
    }

    // Warnings Section
    if (grouped.warning.length > 0) {
      console.log("\n" + "─".repeat(70));
      console.log("⚠️  WARNINGS - MONITOR THESE ISSUES");
      console.log("─".repeat(70));
      
      grouped.warning.forEach((r, index) => {
        console.log(`\n${index + 1}. ${r.source.toUpperCase()}`);
        console.log(`   Status: ${this.formatStatus(r.status)} Warning`);
        console.log(`   Summary: ${r.summary}`);
        console.log(`   Details: ${r.details.substring(0, 300)}${r.details.length > 300 ? '...' : ''}`);
        
        if (r.issues && r.issues.length > 0) {
          console.log(`   Issues:`);
          r.issues.slice(0, 3).forEach(issue => console.log(`     • ${issue}`));
          if (r.issues.length > 3) {
            console.log(`     • ... and ${r.issues.length - 3} more`);
          }
        }
      });
    }

    // Healthy Components Section
    if (grouped.healthy.length > 0) {
      console.log("\n" + "─".repeat(70));
      console.log("✅ HEALTHY COMPONENTS");
      console.log("─".repeat(70));
      console.log();
      
      grouped.healthy.forEach(r => {
        console.log(`  ${this.formatStatus(r.status)} ${r.source}: ${r.summary}`);
      });
    }

    // Summary Statistics
    console.log("\n" + "─".repeat(70));
    console.log("📈 SUMMARY STATISTICS");
    console.log("─".repeat(70));
    console.log(`  Total Checks: ${results.length}`);
    console.log(`  Critical Issues: ${grouped.critical.length}`);
    console.log(`  Warnings: ${grouped.warning.length}`);
    console.log(`  Healthy: ${grouped.healthy.length}`);

    // Overall Assessment
    console.log("\n" + "=".repeat(70));
    const overallStatus = grouped.critical.length > 0 ? "CRITICAL - IMMEDIATE ACTION REQUIRED" :
                         grouped.warning.length > 0 ? "WARNING - NEEDS ATTENTION" : 
                         "HEALTHY - ALL SYSTEMS OPERATIONAL";
    const statusIcon = grouped.critical.length > 0 ? "🔴" :
                      grouped.warning.length > 0 ? "⚠️" : "✅";
    
    console.log(`${statusIcon} OVERALL SYSTEM STATUS: ${overallStatus}`);
    
    // Recommendations
    if (grouped.critical.length > 0 || grouped.warning.length > 0) {
      console.log("\n📝 RECOMMENDED ACTIONS:");
      if (grouped.critical.length > 0) {
        console.log("  1. Address critical issues immediately");
        console.log("  2. Check system logs for more details: journalctl -xe");
        console.log("  3. Monitor dmesg for hardware issues: dmesg -T -w");
      }
      if (grouped.warning.length > 0) {
        console.log("  • Schedule maintenance for warning items");
        console.log("  • Set up monitoring for recurring issues");
      }
    }
    
    console.log("=".repeat(70) + "\n");
  }

  async run() {
    console.log("🔍 Starting Comprehensive System Health Check...\n");

    // Check API connection
    console.log("🤖 Connecting to LLM API...");
    const apiConnected = await this.checkApiConnection();
    
    if (!apiConnected) {
      console.error("❌ Cannot connect to API or model not found!");
      console.error(`   Make sure the API is running at ${this.apiUrl}`);
      console.error(`   and model '${this.model}' is available.`);
      console.error("   For Ollama: ollama pull qwen3:8b");
      Deno.exit(1);
    }
    console.log("✅ API connected successfully\n");

    const results: HealthCheckResult[] = [];
    const totalSources = this.logSources.length;

    for (let i = 0; i < this.logSources.length; i++) {
      const source = this.logSources[i];
      const progress = `[${i + 1}/${totalSources}]`;
      
      process.stdout.write(`${progress} Checking ${source.name}... `);
      
      const logContent = await this.executeCommand(source.command);
      
      // Apply preprocessing if defined
      const processedContent = source.preprocess ? 
        source.preprocess(logContent) : logContent;
      
      if (processedContent.startsWith("Error") || processedContent.startsWith("Failed")) {
        console.log("⚠️  Skipped (no access)");
        results.push({
          source: source.name,
          status: "warning",
          summary: "Could not retrieve logs",
          details: processedContent,
          issues: ["Permission denied or command not available"],
        });
        continue;
      }

      // Skip if empty or too short
      if (processedContent.trim().length < 10) {
        console.log("✅ Clean");
        results.push({
          source: source.name,
          status: "healthy",
          summary: "No issues detected",
          details: "No concerning log entries found in the specified time range",
          issues: [],
        });
        continue;
      }

      process.stdout.write("analyzing... ");
      const analysis = await this.analyzeWithLLM(source, processedContent);
      
      // Print inline status
      if (analysis.status === "critical") {
        console.log("🔴 CRITICAL!");
      } else if (analysis.status === "warning") {
        console.log("⚠️  Warning");
      } else {
        console.log("✅ OK");
      }
      
      results.push(analysis);
    }

    this.printDetailedResults(results);
  }
}

// Main execution
if (import.meta.main) {
  const args = Deno.args;
  
  // Read from environment variables with defaults
  let apiUrl = Deno.env.get("AIOPS_API_URL") || "http://localhost:11434/v1";
  let apiKey = Deno.env.get("AIOPS_API_KEY") || "";
  let model = Deno.env.get("AIOPS_MODEL") || "qwen3:8b";
  let verbose = Deno.env.get("AIOPS_VERBOSE") === "true" || Deno.env.get("AIOPS_VERBOSE") === "1";

  // Parse CLI arguments (override environment variables)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--verbose" || args[i] === "-v") {
      verbose = true;
    } else if (args[i] === "--model" && i + 1 < args.length) {
      model = args[++i];
    } else if (args[i] === "--url" && i + 1 < args.length) {
      apiUrl = args[++i];
    } else if (args[i] === "--key" && i + 1 < args.length) {
      apiKey = args[++i];
    } else if (!args[i].startsWith("-")) {
      // Legacy: allow model as positional argument
      model = args[i];
    }
  }
  
  console.log("🚀 Linux System Health Checker v2.0");
  console.log(`📦 Using model: ${model}`);
  console.log(`🔗 API URL: ${apiUrl}`);
  console.log(`🔑 API Key: ${apiKey ? "***" + apiKey.slice(-4) : "(none)"}`);
  console.log(`📋 Verbose mode: ${verbose ? "ON" : "OFF"}\n`);

  const checker = new SystemHealthChecker(apiUrl, model, apiKey, verbose);
  
  try {
    await checker.run();
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    Deno.exit(1);
  }
}
