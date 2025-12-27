# Linux System Health Checker
> Attention: This repo is entirely vibecoded! Claude Opus 4.1

A comprehensive Deno-based tool that analyzes Linux system logs using any OpenAI-compatible LLM API to provide detailed system health diagnostics.

## Features

- 🔍 **Comprehensive Log Analysis**: Checks 12+ different log sources including dmesg, kernel logs, I/O errors, and more
- 🤖 **AI-Powered Analysis**: Uses any OpenAI-compatible LLM API (Ollama, OpenAI, etc.) for intelligent pattern recognition
- 🔌 **Flexible API Support**: Works with Ollama, OpenAI, or any OpenAI-compatible API endpoint
- ⚙️ **Configurable**: Support for CLI arguments and environment variables
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

2. **LLM API** - Choose one:
   
   **Option A: Ollama (Local, Free)**
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.ai/install.sh | sh
   ollama serve
   
   # Pull a model (recommended: qwen3:8b)
   ollama pull qwen3:8b
   ```
   
   **Option B: OpenAI (Cloud, Paid)**
   - Get an API key from https://platform.openai.com/
   - Set the `AIOPS_API_KEY` environment variable
   
   **Option C: Any OpenAI-compatible API**
   - Configure the API URL with `--url` or `AIOPS_API_URL`
   - Provide API key if required with `--key` or `AIOPS_API_KEY`

3. **Optional Tools** (for enhanced diagnostics):
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

### Basic usage (with local Ollama):
```bash
./main.ts
```

### With verbose output (shows raw log samples):
```bash
./main.ts --verbose
# or
./main.ts -v
```

### With custom model:
```bash
./main.ts --model mistral
```

### With custom API URL (for remote Ollama or other OpenAI-compatible APIs):
```bash
./main.ts --url http://192.168.1.100:11434/v1
```

### With OpenAI or other cloud providers:
```bash
./main.ts --url https://api.openai.com/v1 --key sk-your-api-key --model gpt-4
```

### Using environment variables:
```bash
export AIOPS_API_URL="https://api.openai.com/v1"
export AIOPS_API_KEY="sk-your-api-key"
export AIOPS_MODEL="gpt-4"
export AIOPS_VERBOSE="true"
./main.ts
```

### Configuration Priority
The tool uses the following priority for configuration:
1. **CLI Arguments** (highest priority)
2. **Environment Variables**
3. **Default Values** (lowest priority)

### All Configuration Options

| CLI Argument | Environment Variable | Default | Description |
|-------------|---------------------|---------|-------------|
| `--url` | `AIOPS_API_URL` | `http://localhost:11434/v1` | API base URL |
| `--key` | `AIOPS_API_KEY` | `""` (empty) | API key for authentication |
| `--model` | `AIOPS_MODEL` | `qwen3:8b` | Model name/ID to use |
| `--verbose` or `-v` | `AIOPS_VERBOSE` | `false` | Enable verbose output |

### Run with sudo for full access to all logs:
```bash
sudo deno run -A main.ts
```

## Sample Output

```
🚀 Linux System Health Checker v2.0
📦 Using model: qwen3:8b
🔗 API URL: http://localhost:11434/v1
🔑 API Key: (none)
📋 Verbose mode: OFF

🔍 Starting Comprehensive System Health Check...

🤖 Connecting to LLM API...
✅ API connected successfully

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

## API Provider Examples

### Using with Ollama (Local, Default)
```bash
# Default configuration (Ollama on localhost)
./main.ts

# Remote Ollama instance
./main.ts --url http://192.168.1.100:11434/v1 --model llama3.2
```

### Using with OpenAI
```bash
./main.ts \
  --url https://api.openai.com/v1 \
  --key sk-your-api-key-here \
  --model gpt-4

# Or with environment variables
export AIOPS_API_URL="https://api.openai.com/v1"
export AIOPS_API_KEY="sk-your-api-key-here"
export AIOPS_MODEL="gpt-4"
./main.ts
```

### Using with Other OpenAI-Compatible APIs
Many providers offer OpenAI-compatible endpoints:

```bash
# Azure OpenAI
./main.ts --url https://your-resource.openai.azure.com/openai/deployments/your-deployment --key your-azure-key

# Together AI
./main.ts --url https://api.together.xyz/v1 --key your-together-key --model meta-llama/Llama-3-70b-chat-hf

# Anthropic (via OpenAI compatibility layer if available)
# Or any other OpenAI-compatible endpoint
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