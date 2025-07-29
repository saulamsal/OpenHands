# Specialized Microagent System for QlurAI

## Overview

This document outlines QlurAI's specialized microagent system that transforms OpenHands into a framework-specific development platform. Our approach uses OpenHands' built-in microagent system combined with template-based project initialization for fast, specialized development.

## Architecture Decision

### Why Microagents Over Custom Agents?

After analyzing OpenHands architecture, we chose **microagents + backend injection** over custom agents because:

1. **Minimal Code Changes**: 1 file vs 9+ files for custom agent
2. **Uses OpenHands Patterns**: Leverages built-in microagent system 
3. **Always Active**: Backend injection ensures specialization without user keywords
4. **Scalable**: Easy to add new frameworks (Next.js, React, etc.)
5. **Template Integration**: Can instruct template copying from microagent prompts

### System Architecture

```
QlurAI Platform
├── Backend Injection Layer
│   └── Auto-injects framework keywords into user prompts
├── Microagents System
│   ├── microagents/expo.md         # Expo specialization
│   ├── microagents/nextjs.md       # Future: Next.js specialization
│   └── microagents/react.md        # Future: React specialization
└── Template System
    ├── templates/expo/
    │   ├── default/                 # Basic Expo Router + NativeWind + MMKV
    │   ├── saas/                    # SaaS starter with auth + payments
    │   ├── consumer/                # Consumer app with onboarding
    │   ├── health/                  # Healthcare/fitness template
    │   └── marketplace/             # Two-sided marketplace
    ├── templates/nextjs/
    │   ├── default/                 # Basic Next.js + Tailwind
    │   └── saas/                    # Next.js SaaS starter
    └── templates/react/
        └── default/                 # Basic React + Vite
```

## Implementation Strategy

### Phase 1: Expo Specialization (Current)

**Goal**: Transform QlurAI into specialized Expo/React Native development platform

**Components**:
1. **Microagent**: `microagents/expo.md` with universal app expertise
2. **Templates**: Pre-built Expo Router projects with NativeWind + MMKV
3. **Backend Injection**: Auto-inject "expo" keyword to activate microagent
4. **Template Copying**: Instructions to copy templates instead of running `npx create-expo-app`

**Key Features**:
- Universal apps (iOS, Android, Web)
- NativeWind styling (Tailwind for React Native)
- Expo Router navigation
- React Native MMKV storage
- Web compatibility shims
- Instant project setup (<5 seconds)

### Phase 2: Multi-Framework Support (Future)

**Goal**: Expand to Next.js, React, and other frameworks

**Framework Detection Logic**:
```
User Request Analysis:
├── Mobile App Keywords → Inject "expo"
├── Web App Keywords → Inject "nextjs" 
├── Dashboard Keywords → Inject "nextjs"
└── Component Library Keywords → Inject "react"
```

## Template System

### Directory Structure

```
templates/
├── shared/                          # Common utilities and components
│   ├── components/                  # Universal UI components
│   ├── hooks/                       # Custom hooks
│   ├── utils/                       # Helper functions
│   └── shims/                       # Web compatibility shims
│       └── web_shim.ts              # Native library fallbacks
├── expo/
│   ├── default/                     # Basic setup
│   │   ├── app/                     # Expo Router structure
│   │   ├── components/              # UI components
│   │   ├── lib/                     # Utilities
│   │   ├── package.json             # Dependencies
│   │   ├── tailwind.config.js       # NativeWind config
│   │   └── app.json                 # Expo config
│   ├── saas/                        # SaaS starter
│   │   ├── extends: default         # Inherits from default
│   │   ├── lib/auth/               # Supabase auth
│   │   ├── lib/payments/           # Stripe integration
│   │   └── app/(auth)/             # Auth screens
│   ├── consumer/                    # Consumer app
│   ├── health/                      # Healthcare template
│   └── marketplace/                 # Marketplace template
├── nextjs/                          # Future
└── react/                           # Future
```

### Template Features

**Expo Templates Include**:
- **NativeWind**: Tailwind CSS for React Native styling
- **Expo Router**: File-based navigation (works on web too)
- **React Native MMKV**: High-performance storage
- **TypeScript**: Full type safety
- **Web Shims**: Compatibility layer for native libraries
- **Universal Components**: Works on iOS, Android, Web

## Microagent Implementation

### Structure

Each microagent follows this pattern:

```markdown
---
name: expo
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- expo
- react native
- mobile app
- universal app
---

[Specialized instructions for framework]
```

### Expo Microagent Key Instructions

1. **Always Universal**: Every app MUST work on iOS, Android, Web
2. **Template-Based**: Copy from `templates/expo/{type}` instead of `npx`
3. **NativeWind Styling**: Use `className` with Tailwind classes
4. **Expo Router Navigation**: File-based routing in `app/` directory
5. **MMKV Storage**: Replace AsyncStorage with MMKV
6. **Web Shims**: Handle native libraries with web fallbacks

## Backend Integration

### Keyword Injection Strategy

**Current (Phase 1)**:
```typescript
// Auto-inject "expo" for all requests
const enhancedPrompt = `expo ${userPrompt}`;
```

**Future (Phase 2)**:
```typescript
const detectFramework = (prompt: string) => {
  if (isMobileApp(prompt)) return "expo";
  if (isWebApp(prompt)) return "nextjs";
  if (isComponent(prompt)) return "react";
  return "expo"; // Default to Expo
};

const enhancedPrompt = `${detectFramework(userPrompt)} ${userPrompt}`;
```

## Benefits

### For Users
- **Fast Development**: Projects start in <5 seconds
- **Production Quality**: Premium templates with best practices
- **Universal Apps**: One codebase for all platforms
- **No Learning Curve**: Templates handle complex setup

### For Developers
- **Minimal Maintenance**: Templates easier than code generation
- **Consistent Quality**: Pre-tested, optimized setups
- **Easy Expansion**: Add new templates and microagents
- **Scalable Architecture**: Framework-agnostic system

## Adding New Frameworks

### Step-by-Step Process

1. **Create Microagent**:
   ```bash
   # Example for Next.js
   touch microagents/nextjs.md
   ```

2. **Create Templates**:
   ```bash
   mkdir -p templates/nextjs/default
   mkdir -p templates/nextjs/saas
   ```

3. **Update Backend Detection**:
   ```typescript
   // Add framework detection logic
   if (isNextJSRequest(prompt)) return "nextjs";
   ```

4. **Test & Deploy**:
   - Test template copying
   - Verify microagent activation
   - Deploy with new framework support

### Template Creation Guidelines

1. **Use Framework Best Practices**: Latest patterns and conventions
2. **Include TypeScript**: Full type safety out of the box
3. **Optimize for Performance**: Fast builds, small bundles
4. **Add Essential Dependencies**: Common libraries pre-installed
5. **Create README**: Clear setup and development instructions
6. **Test All Platforms**: Ensure universal compatibility

## Monitoring & Analytics

### Key Metrics
- Template usage frequency
- Project success rates
- User satisfaction scores
- Performance metrics (initialization time)

### Future Enhancements
- Template marketplace for community contributions
- AI-powered template recommendations
- Custom template generation based on requirements
- Integration with popular design systems

## Conclusion

This specialized microagent system positions QlurAI as the premier platform for framework-specific development. By combining OpenHands' microagent system with our template-based approach, we achieve:

- **Speed**: Instant project initialization
- **Quality**: Production-ready templates
- **Specialization**: Deep framework expertise
- **Scalability**: Easy framework additions
- **Maintainability**: Minimal code complexity

The system is designed for rapid expansion while maintaining simplicity and reliability. Each framework addition follows the same pattern: microagent + templates + backend detection, making QlurAI the go-to platform for specialized AI-powered development.