# Linux System Health Checker
> Attention: This repo is entirely vibecoded! Claude Opus 4.1

A comprehensive Deno-based tool that analyzes Linux system logs using Ollama LLM to provide detailed system health diagnostics.

## Features

- 🔍 **Comprehensive Log Analysis**: Checks 12+ different log sources including dmesg, kernel logs, I/O errors, and more
- 🤖 **AI-Powered Analysis**: Uses Ollama LLM for intelligent pattern recognition
- 📊 **Detailed Reporting**: Provides specific issues, error messages, and actionable recommendations
- ⚡ **Efficient**: Only checks recent logs with smart filtering
- 🎯 **Prioritized Output**: Critical issues → Warnings → Healthy components
- 📝 **Actionable Insights**: Specific error messages and recommended actions

## Log Sources Analyzed

| Source | Description | What It Detects |
|--------|-------------|-----------------|
| **dmesg-errors** | Kernel ring buffer errors | Hardware failures, driver issues, kernel panics |
| **dmesg-warnings** | Kernel warnings | USB issues, filesystem warnings |
| **kernel-crashes** | Kernel critical events | System crashes, panics, oops |
| **disk-health** | Disk usage & SMART status | Full disks, failing drives |
| **memory-pressure** | Memory & swap usage | Memory exhaustion, excessive swapping |
| **io-errors** | I/O and disk errors | Bad sectors, failing storage |
| **systemd-failures** | Failed services | Service crashes, configuration issues |
| **network-errors** | Network interface statistics | Packet drops, interface errors |
| **temperature** | System temperatures | Overheating issues |
| **oom-killer** | Out of Memory events | Memory exhaustion incidents |
| **security-audit** | Security events | Failed logins, break-in attempts |
| **process-crashes** | Application crashes | Segfaults, core dumps |

## Prerequisites

1. **Deno** - Install from https://deno.land/
   ```bash
   curl -fsSL https://deno.land/x/install/install.sh | sh
   ```

2. **Ollama** - Install and run Ollama
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ollama serve
   ```

3. **LLM Model** - Pull a model (recommended: qwen3:8b)
   ```bash
   ollama pull qwen3:8b
   ```

4. **Optional Tools** (for enhanced diagnostics):
   ```bash
   # For temperature monitoring
   sudo apt-get install lm-sensors
   sudo sensors-detect
   
   # For SMART disk monitoring
   sudo apt-get install smartmontools
   ```

## Installation

```bash
# Download the script
wget https://raw.githubusercontent.com/yourusername/yourrepo/main/main.ts

# Make it executable
chmod +x main.ts
```

## Usage

### Basic usage:
```bash
./main.ts
```

### With verbose output (shows raw log samples):
```bash
./main.ts --verbose
```

### With custom model:
```bash
./main.ts --model mistral
```

### With custom Ollama URL:
```bash
./main.ts --url http://192.168.1.100:11434
```

### Run with sudo for full access to all logs:
```bash
sudo deno run -A main.ts
```

## Sample Output

```
🚀 Linux System Health Checker v2.0
📦 Using model: llama3.2
🔗 Ollama URL: http://localhost:11434
📋 Verbose mode: OFF

🔍 Starting Comprehensive System Health Check...

🤖 Connecting to Ollama LLM...
✅ Ollama connected successfully

[1/12] Checking dmesg-errors... analyzing... 🔴 CRITICAL!
[2/12] Checking dmesg-warnings... analyzing... ⚠️  Warning
[3/12] Checking kernel-crashes... ✅ Clean
[4/12] Checking disk-health... analyzing... ⚠️  Warning
[5/12] Checking memory-pressure... analyzing... ✅ OK
...

======================================================================
📊 SYSTEM HEALTH CHECK DETAILED REPORT
======================================================================
🕐 Timestamp: 1/8/2025, 10:30:45 PM
🖥️  Hostname: production-server-01
======================================================================

──────────────────────────────────────────────────────────────────────
🔴 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION
──────────────────────────────────────────────────────────────────────

1. DMESG-ERRORS
   Status: 🔴 CRITICAL
   Summary: Multiple I/O errors detected on /dev/sda
   Details: Critical I/O errors indicating possible disk failure. 
            Device /dev/sda showing read errors and bad sectors.
   Specific Issues Found:
     • I/O error, dev sda, sector 2048576
     • Buffer I/O error on device sda1
     • SMART Health Status: FAILING

──────────────────────────────────────────────────────────────────────
⚠️  WARNINGS - MONITOR THESE ISSUES
──────────────────────────────────────────────────────────────────────

1. DISK-HEALTH
   Status: ⚠️  Warning
   Summary: Root partition at 89% capacity
   Details: /dev/sda1 mounted on / is nearly full (89% used).
            Only 11GB free space remaining.
   Issues:
     • High disk usage on root partition
     • Consider cleaning up log files
     • Check /var/log for old logs

2. SECURITY-AUDIT
   Status: ⚠️  Warning
   Summary: Multiple failed SSH authentication attempts detected
   Details: 47 failed password attempts from IP 192.168.1.105
   Issues:
     • Potential brute force attempt
     • Consider implementing fail2ban

──────────────────────────────────────────────────────────────────────
✅ HEALTHY COMPONENTS
──────────────────────────────────────────────────────────────────────

  ✅ kernel-crashes: No kernel crashes or panics detected
  ✅ memory-pressure: Memory usage normal (4.2GB/16GB used, no swap)
  ✅ systemd-failures: All services running normally
  ✅ temperature: CPU temp 45°C, all temperatures within normal range

──────────────────────────────────────────────────────────────────────
📈 SUMMARY STATISTICS
──────────────────────────────────────────────────────────────────────
  Total Checks: 12
  Critical Issues: 1
  Warnings: 2
  Healthy: 9

======================================================================
🔴 OVERALL SYSTEM STATUS: CRITICAL - IMMEDIATE ACTION REQUIRED

📝 RECOMMENDED ACTIONS:
  1. Address critical issues immediately
  2. Check system logs for more details: journalctl -xe
  3. Monitor dmesg for hardware issues: dmesg -T -w
  • Schedule maintenance for warning items
  • Set up monitoring for recurring issues
======================================================================
```

## Customization

You can add custom log sources by editing the `logSources` array:

```typescript
{
  name: "custom-check",
  command: ["your-command", "args"],
  description: "What this check does",
  critical: true,
  preprocess: (content: string) => {
    // Optional: filter or transform the output
    return content;
  }
}
```

## Troubleshooting

### Permission Issues
Some checks require root access:
```bash
sudo ./main.ts
```

### dmesg Access
If dmesg requires sudo, add your user to the systemd-journal group:
```bash
sudo usermod -a -G systemd-journal $USER
```

### Missing Commands
Install missing tools:
```bash
# For sensors
sudo apt-get install lm-sensors

# For smartctl
sudo apt-get install smartmontools

# For network statistics
sudo apt-get install net-tools
```

## License

MIT