# QlurAI Microagent Creation Guide

## 🎯 The Ultimate Guide to Building Bulletproof Microagents

*Based on extensive testing, debugging, and optimization of the QlurAI platform*

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Critical Lessons Learned](#critical-lessons-learned)
3. [Command Structure Best Practices](#command-structure-best-practices)
4. [OpenHands Integration](#openhands-integration)
5. [Template Structure](#template-structure)
6. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
7. [Testing & Validation](#testing--validation)
8. [Examples & Templates](#examples--templates)

---

## Core Principles

### 1. **Work WITH OpenHands, Not Against It**

**❌ Wrong Approach:**
- Complex port mapping with socat
- Fighting OpenHands' native systems
- Overriding built-in functionality

**✅ Correct Approach:**
- Leverage OpenHands' automatic port detection
- Use native "Available Hosts" feature
- Let OpenHands handle what it's designed for

### 2. **Simplicity Over Complexity**

**❌ Wrong Approach:**
```bash
# Complex chaining with verification
echo "Installing..." && \
if ! command -v tool; then \
  install_tool && verify_installation && \
  if check_status; then \
    start_service && map_port && verify_mapping
  fi
fi
```

**✅ Correct Approach:**
```bash
# Simple, linear commands
echo "Installing..." && install_tool
echo "Starting..." && start_service &
echo "Done! Check Available Hosts"
```

### 3. **Agent-Proof Design**

Design microagents so agents **cannot** deviate or improvise:
- Use specific, unambiguous commands
- Avoid conditional logic agents might "interpret"
- Provide single-path execution

---

## Critical Lessons Learned

### 1. **Command Chaining Issues**

**Problem:** OpenHands agents frequently got "Cannot execute multiple commands at once" errors.

**Root Causes:**
- Mixing `&` (background) with `&&` (chaining)
- Complex multi-line conditionals
- Newlines breaking command chains

**Solution:**
```bash
# ❌ BROKEN - Background + chaining
npm run dev > log.txt 2>&1 & && sleep 5 && check_status

# ✅ WORKS - Separate commands
npm run dev > log.txt 2>&1 &
sleep 10 && echo "Server started"
```

### 2. **Port Mapping Complexity**

**Problem:** Complex socat port mapping caused multiple failures:
- socat installation issues
- Wrong port numbers (56717, 51523 instead of 51555)
- APT lock conflicts
- Command syntax errors

**Solution:** **Remove port mapping entirely!**
```bash
# ❌ COMPLEX - Manual port mapping
sudo apt-get update && sudo apt-get install -y socat
socat TCP-LISTEN:51555,fork TCP:localhost:8081 &

# ✅ SIMPLE - Let OpenHands detect
npm run dev:web &
# OpenHands automatically shows in "Available Hosts"
```

### 3. **Package Manager Choice**

**Problem:** Using bun caused:
- Long download times (30+ seconds per session)
- Permission issues with global installation
- Path persistence problems

**Solution:** **Use npm (already available in containers)**
```bash
# ❌ SLOW - Install bun every time
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
bun install

# ✅ FAST - Use pre-installed npm
npm install
```

### 4. **Template Path Issues**

**Problem:** Local template paths broke when folder was deleted.

**Solution:** **Use public GitHub repository**
```bash
# ✅ RELIABLE - Public repository
if [ ! -d "qlur-templates" ]; then
  git clone https://github.com/qlur-ai/templates.git qlur-templates
fi
cp -r qlur-templates/expo/default ./MyApp
```

---

## Command Structure Best Practices

### 1. **Single Command Chains**

**Do:**
```bash
echo "Step 1..." && command1 && command2 && command3
```

**Don't:**
```bash
echo "Step 1..."
command1
command2  # Agent splits this into separate executions
```

### 2. **Background Process Handling**

**Do:**
```bash
# Start background process alone
npm run dev &

# Separate follow-up commands
sleep 10 && echo "Service started"
```

**Don't:**
```bash
# Mixing background with chaining
npm run dev & && sleep 10 && echo "Started"  # Syntax error
```

### 3. **Error Prevention**

**Do:**
```bash
# Add safety operators
pkill -f "process" 2>/dev/null || true
npm install && npm run dev &
```

**Don't:**
```bash
# Assume clean state
pkill -f "process"  # May fail and stop execution
```

### 4. **Dependency Management**

**Do:**
```bash
# Install all dependencies upfront
npm install && npm install specific-package && npm install another-package
```

**Don't:**
```bash
# Install on-demand
npm install
# Later: npm install specific-package  # Agent may skip this
```

---

## OpenHands Integration

### 1. **Native Port Detection**

OpenHands automatically detects HTTP services via:
- Continuous port scanning
- `/api/conversations/{conversation_id}/web-hosts` endpoint
- "Available Hosts" UI display

**Requirements for detection:**
- Service must bind to localhost
- Must respond to HTTP requests
- Usually detected within 10-30 seconds

### 2. **Supported Frameworks**

OpenHands automatically detects:
- **Expo**: Usually port 8081
- **Next.js**: Port 3000
- **React**: Port 3000
- **Django**: Port 8000
- **Laravel**: Port 8000
- **Streamlit**: Port 8501
- **Flask/FastAPI**: Port 5000
- **Any HTTP service**: Any port

### 3. **Best Practices for Detection**

```bash
# ✅ Let framework choose port
npm run dev &

# ✅ Use standard framework commands
streamlit run app.py &
python manage.py runserver &
php artisan serve &

# ❌ Don't override ports unnecessarily
npm run dev -- --port 3001  # May confuse detection
```

---

## Template Structure

### 1. **Microagent File Structure**

```yaml
---
name: framework_name
type: knowledge
version: 1.0.0
triggers:
- primary_keyword
- alternative_name
- common_abbreviation
---

# Framework Expert

You are an expert in [Framework] development...

## Project Initialization

[Simple setup commands]

## Key Features

[Brief feature list]

## Best Practices

[Essential guidelines]
```

### 2. **Setup Command Pattern**

**Standard template for all microagents:**
```bash
# 1. Clean up
pkill -f "service_name" 2>/dev/null || true

# 2. Setup project  
[framework_specific_setup]

# 3. Install dependencies
[package_manager] install [additional_packages]

# 4. Start service
[start_command] &

# 5. Confirmation
echo "✅ Done! OpenHands will show [Framework] app in 'Available Hosts' automatically"
```

### 3. **Framework-Specific Examples**

**Expo:**
```bash
# Clean, setup, install, start
pkill -f "expo" 2>/dev/null || true && pkill -f "node" 2>/dev/null || true
git clone https://github.com/qlur-ai/templates.git qlur-templates && cp -r qlur-templates/expo/default ./MyApp && cd MyApp
npm install
npx expo start --web --clear &
echo "✅ Done! OpenHands will show Expo app in 'Available Hosts' automatically"
```

**Django:**
```bash
pip install django
django-admin startproject MyProject && cd MyProject
python manage.py startapp myapp && python manage.py migrate
python manage.py runserver &
echo "✅ Done! OpenHands will show Django app in 'Available Hosts' automatically"
```

---

## Common Pitfalls & Solutions

### 1. **Command Execution Errors**

**Problem:** "Cannot execute multiple commands at once"
**Solution:** Use proper `&&` chaining in single command

**Problem:** Background processes with chaining
**Solution:** Separate background (`&`) from chaining (`&&`)

### 2. **Port and Service Issues**

**Problem:** Services not appearing in "Available Hosts"
**Solutions:**
- Wait longer (up to 30 seconds for Metro bundling)
- Ensure service binds to localhost (not 127.0.0.1 only)
- Check if service actually started with `curl localhost:PORT`

**Problem:** Port conflicts
**Solution:** Proper cleanup with `pkill` before starting

### 3. **Dependency Issues**

**Problem:** Missing packages causing runtime errors
**Solution:** Install ALL required dependencies upfront

**Problem:** Package manager not found
**Solution:** Use npm (pre-installed) instead of bun/yarn

### 4. **Agent Improvisation**

**Problem:** Agents modifying commands, adding flags, troubleshooting
**Solution:** Make commands so simple and specific that no interpretation is needed

---

## Testing & Validation

### 1. **Test Scenarios**

Test each microagent with:
- **Fresh environment** (clean OpenHands session)
- **Multiple iterations** (restart and test again)
- **Different apps** (todo, reminder, counter apps)
- **Error scenarios** (port conflicts, missing dependencies)

### 2. **Success Criteria**

✅ **Must work on first try**
✅ **No agent troubleshooting/improvisation**
✅ **Appears in OpenHands "Available Hosts"**
✅ **No command execution errors**
✅ **Fast execution (< 2 minutes total)**

### 3. **Common Test Failures**

❌ Command chaining syntax errors
❌ Background process issues
❌ Missing dependencies
❌ Agent deviating from instructions
❌ Port mapping complexity

---

## Examples & Templates

### 1. **Minimal Microagent Template**

```yaml
---
name: simple_framework
type: knowledge
version: 1.0.0
triggers:
- framework
---

# Framework Expert

## Project Initialization

```bash
# Simple setup
setup_command && install_dependencies && start_service &
echo "✅ Done! Check Available Hosts"
```

## Key Features
- Feature 1
- Feature 2

## Best Practices
- Use simple commands
- Let OpenHands handle detection
```

### 2. **Complex Framework Template**

For frameworks requiring more setup:

```yaml
---
name: complex_framework
type: knowledge
version: 1.0.0
triggers:
- framework
- alt_name
---

# Framework Expert

## ⚠️ IMPORTANT: Don't Troubleshoot - Start Fresh

If you encounter ANY issues, **DO NOT** debug. Instead:

```bash
# 1. Clean everything
rm -rf ./current-project

# 2. Start fresh
[simple_setup_commands]
```

### ❌ What NOT to Do:
- Don't modify configuration files
- Don't add custom flags
- Don't troubleshoot errors

### ✅ What Always Works:
- Use exact commands above
- Let framework choose defaults
- Wait for OpenHands detection
```

---

## Final Guidelines

### 1. **Design Philosophy**

- **Simplicity**: Always choose the simplest approach
- **Reliability**: Must work every time, first try
- **Speed**: Minimize setup time
- **Compatibility**: Work with OpenHands' design, not against it

### 2. **Review Checklist**

Before deploying a microagent:

- [ ] Commands are properly chained with `&&`
- [ ] Background processes (`&`) are separate from chaining
- [ ] All dependencies installed upfront
- [ ] Uses npm instead of bun
- [ ] No complex port mapping
- [ ] No conditional logic agents can misinterpret
- [ ] Tested in clean OpenHands environment
- [ ] Works on first try without troubleshooting

### 3. **Maintenance**

- Test microagents regularly
- Update when OpenHands behavior changes
- Simplify further based on user feedback
- Document any new patterns discovered

---

## Conclusion

The key to successful microagents is **radical simplicity**. Every complexity we removed made the system more reliable:

- ❌ Complex port mapping → ✅ OpenHands native detection
- ❌ Bun installation → ✅ Pre-installed npm
- ❌ Complex command chains → ✅ Simple sequential commands
- ❌ Conditional logic → ✅ Linear execution

**Remember: If agents can improvise or deviate, they will. Design microagents to be agent-proof.**

---

*This guide represents lessons learned from extensive testing and optimization of the QlurAI platform. Follow these principles to create microagents that work reliably every time.*