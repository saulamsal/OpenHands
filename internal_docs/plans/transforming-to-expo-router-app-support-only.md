# Transforming Qlur AI to Expo Router App Support Only

## Executive Summary

This document provides a comprehensive plan to transform the **Qlur AI platform** from a general-purpose AI software engineer into a specialized, niche platform that exclusively supports **Expo Router-based React Native applications**. Qlur AI is positioned as an **autonomous AI frontend engineer** that excels at mobile app development while maintaining the ability to expand to other platforms in the future.

## Product Identity

**Qlur AI** is an autonomous AI frontend engineer that specializes in building mobile applications with Expo Router. When users ask "What is Qlur AI?", the system should respond with clear branding and positioning.

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Transformation Strategy](#transformation-strategy)
3. [System Prompt vs Microagent Strategy](#system-prompt-vs-microagent-strategy)
4. [Phase-by-Phase Implementation Plan](#phase-by-phase-implementation-plan)
5. [Technical Implementation Details](#technical-implementation-details)
6. [Future-Proofing Strategy](#future-proofing-strategy)
7. [Success Metrics](#success-metrics)
8. [Risk Assessment](#risk-assessment)
9. [Rollback Plan](#rollback-plan)

## Current Architecture Analysis

### Strengths to Leverage

1. **Excellent Existing Expo Support**
   - Comprehensive `microagents/expo.md` with best practices
   - Project detection system already prioritizes Expo (first in detection list)
   - Complete App Store integration for mobile app cloning
   - Universal app development guidelines already established

2. **Robust Foundation**
   - Sophisticated conversation management system
   - Advanced microagent system with trigger-based loading
   - Project detection with confidence scoring
   - Multi-provider Git integration (GitHub, GitLab, Bitbucket)
   - File-based storage with S3/MinIO integration

3. **Well-Architected Frontend**
   - React-based frontend with TypeScript
   - TanStack Query for data management
   - Modular component architecture
   - Framework selection capabilities

### Current Limitations for Expo-Only Focus

1. **Framework Ambiguity**
   - Multiple framework options confuse users
   - Generic system prompts don't emphasize mobile development
   - Frontend shows all project types equally
   - Repository filtering doesn't prioritize mobile projects

2. **Scattered Mobile Focus**
   - App Store integration is secondary feature
   - Mobile-specific features buried in general UI
   - No clear mobile development workflow
   - Expo expertise not prominently featured

## Transformation Strategy

### Core Philosophy

> "Hi! I'm Qlur AI, your autonomous AI frontend engineer. I specialize exclusively in Expo Router apps - nothing else, not even Next.js or other frameworks. Let me help you build amazing mobile apps with Expo Router instead!"

### Brand Identity Integration

When users ask about the system identity, Qlur AI should respond:
> "I'm Qlur AI, an autonomous AI frontend engineer that specializes in building mobile applications with Expo Router. I help you create universal React Native apps that work seamlessly on iOS, Android, and web platforms."

### Strategic Pillars

1. **Exclusive Focus**: Only Expo Router applications are supported
2. **Mobile-First UX**: All interfaces optimized for mobile app development
3. **Opinionated Approach**: Clear, prescribed patterns and best practices
4. **Template-Driven**: Pre-built boilerplates for instant setup
5. **Future-Expandable**: Maintain architecture for future platform additions

## System Prompt vs Microagent Strategy

### Token Cost Analysis

After comprehensive analysis of the codebase and token costs:

- **Current System Prompt**: 1,160 words (~1,500-2,000 tokens) - **Always loaded (0 extra cost)**
- **Existing Expo Microagent**: 2,253 words (~3,000-4,000 tokens) - **Extra cost if always loaded**

### Strategic Decision: System Prompt First Approach

**For Current Expo-Only Phase**: Use **System Prompt** as primary rule enforcement mechanism.

#### Why System Prompt is Optimal Now

1. **Zero Extra Token Cost**: System prompt is always loaded regardless
2. **Guaranteed Rule Enforcement**: No dependency on trigger words
3. **Consistent Qlur AI Identity**: Every conversation starts with proper branding
4. **Perfect for Single-Framework Focus**: Ideal when supporting only Expo Router

#### Implementation Strategy

**System Prompt Contains (Always Active)**:
- ✅ **Qlur AI Identity & Branding**: "I'm Qlur AI, autonomous AI frontend engineer"
- ✅ **Expo-Only Enforcement**: Redirect all non-Expo requests
- ✅ **Critical Expo Rules**: 10-15 most important rules that must NEVER be broken
- ✅ **Core Setup Process**: Essential 3-step Expo setup commands
- ✅ **Framework Redirections**: Handle Next.js/Laravel/etc. requests

**Microagent Contains (Trigger-Based for Now)**:
- 📚 **Detailed Implementation Examples**: Complex code samples
- 📚 **Troubleshooting Guides**: Comprehensive error resolution
- 📚 **Advanced Patterns**: Sophisticated development techniques
- 📚 **Reference Documentation**: Links and detailed explanations

### Critical Expo Rules for System Prompt

The following essential rules should be embedded directly in the system prompt:

```jinja2
<CRITICAL_EXPO_RULES>
MANDATORY EXPO ROUTER RULES - NEVER DEVIATE:

1. **Project Setup**: ALWAYS use qlur-ai/templates, NEVER npx create-expo-app
2. **Styling**: ALWAYS use NativeWind className, NEVER StyleSheet.create  
3. **Storage**: ALWAYS use React Native MMKV, NEVER AsyncStorage
4. **Navigation**: ALWAYS use Expo Router file-based routing in app/ directory
5. **Dependencies**: ALWAYS use npm install --force for NativeWind compatibility
6. **Startup**: ALWAYS use npx expo start --web --tunnel (never background &)
7. **Universal First**: Every component MUST work on iOS, Android, AND Web
8. **TypeScript**: ALWAYS use TypeScript, never plain JavaScript
9. **Phase Approach**: Get basic app running FIRST, then add features
10. **Template Structure**: Never modify core template files without explicit approval

SETUP COMMANDS (NEVER MODIFY):
git clone https://github.com/qlur-ai/templates.git qlur-templates && mkdir -p MyApp && cp -r qlur-templates/expo/default/* MyApp/ && cd MyApp
npm install --force  
npx expo start --web --tunnel
</CRITICAL_EXPO_RULES>
```

### Future Multi-Framework Strategy

**When Expanding to Multiple Frameworks**:

1. **System Prompt Evolution**: 
   - Keep Qlur AI identity and core behavior
   - Add framework detection and routing logic
   - Remove Expo-specific rules (move to microagents)

2. **Microagent Architecture**:
   - `microagents/expo.md` - Always loaded for Expo projects
   - `microagents/nextjs.md` - Always loaded for Next.js projects  
   - `microagents/laravel.md` - Always loaded for Laravel projects
   - Framework-specific rules become microagent responsibility

3. **Cost Implications**:
   - Multi-framework = +3,000-4,000 tokens per conversation per framework
   - Acceptable cost when supporting multiple frameworks
   - Framework detection determines which microagents to load

### Benefits of This Approach

**Immediate (Expo-Only Phase)**:
- ✅ Zero extra token costs
- ✅ Rules always enforced  
- ✅ Perfect user experience consistency
- ✅ No confusion about framework choice

**Future (Multi-Framework Phase)**:
- ✅ Clean separation of concerns
- ✅ Framework-specific expertise depth
- ✅ Scalable architecture
- ✅ Maintainable rule management

## Phase-by-Phase Implementation Plan

### Phase 1: System Prompt & AI Behavior Transformation
**Timeline: Week 1**
**Priority: CRITICAL**

#### 1.1 System Prompt Enhancement (Primary Focus)
- **File**: `openhands/agenthub/codeact_agent/prompts/system_prompt.j2`
- **Strategy**: Add comprehensive Qlur AI identity and critical Expo rules directly to system prompt
- **Changes**:
  ```jinja2
  # Add Qlur AI identity section at the very top
  <QLUR_AI_IDENTITY>
  You are Qlur AI, an autonomous AI frontend engineer that specializes exclusively in building mobile applications with Expo Router.

  When users ask "What are you?" or "Who are you?":
  * Respond: "I'm Qlur AI, your autonomous AI frontend engineer. I specialize in building mobile applications with Expo Router."
  * Emphasize: "I help you create universal React Native apps that work seamlessly on iOS, Android, and web platforms."

  When users request help with other frameworks (Next.js, Laravel, etc.):
  * Politely redirect: "Hi! I'm Qlur AI, and I specialize exclusively in Expo Router apps. Let me help you build an amazing mobile app with Expo Router instead!"
  * Suggest mobile equivalent: "Would you like to build a mobile version of that using React Native and Expo Router?"
  </QLUR_AI_IDENTITY>

  <CRITICAL_EXPO_RULES>
  MANDATORY EXPO ROUTER RULES - NEVER DEVIATE:

  1. **Project Setup**: ALWAYS use qlur-ai/templates, NEVER npx create-expo-app
  2. **Styling**: ALWAYS use NativeWind className, NEVER StyleSheet.create  
  3. **Storage**: ALWAYS use React Native MMKV, NEVER AsyncStorage
  4. **Navigation**: ALWAYS use Expo Router file-based routing in app/ directory
  5. **Dependencies**: ALWAYS use npm install --force for NativeWind compatibility
  6. **Startup**: ALWAYS use npx expo start --web --tunnel (never background &)
  7. **Universal First**: Every component MUST work on iOS, Android, AND Web
  8. **TypeScript**: ALWAYS use TypeScript, never plain JavaScript
  9. **Phase Approach**: Get basic app running FIRST, then add features
  10. **Template Structure**: Never modify core template files without explicit approval
  
  MANDATORY 3-STEP SETUP (NEVER MODIFY):
  Step 1: git clone https://github.com/qlur-ai/templates.git qlur-templates && mkdir -p MyApp && cp -r qlur-templates/expo/default/* MyApp/ && cd MyApp
  Step 2: npm install --force
  Step 3: npx expo start --web --tunnel
  </CRITICAL_EXPO_RULES>
  ```

#### 1.2 Microagent Strategy Adjustment
- **Keep Existing**: Maintain current `microagents/expo.md` for detailed guidance
- **Trigger-Based**: Continue using trigger-based loading (expo, react native, mobile app, etc.)
- **No Always-Loading**: Avoid +3,000 token cost per conversation
- **Future-Ready**: Architecture prepared for multi-framework expansion

#### 1.3 Other Framework Microagents
- **Update**: Redirect existing framework microagents (nextjs.md, laravel.md) to Expo
- **Simple Redirect**: Replace content with "I specialize in Expo Router apps now!"
- **Preserve Files**: Keep original content commented for future restoration

### Phase 2: Frontend UI Transformation
**Timeline: Week 1-2**
**Priority: HIGH**

#### 2.1 Home Header Simplification
- **File**: `frontend/src/components/features/home/home-header.tsx`
- **Changes**:
  ```typescript
  // Remove framework selector dropdown (lines 374-408)
  // Set immutable framework
  const FIXED_FRAMEWORK = "expo-router";

  // Update project input placeholder
  placeholder="Describe your mobile app idea or paste a repo URL..."

  // Add mobile-first messaging
  const frameworks = [
    {
      key: "expo-router",
      label: "Expo Router",
      icon: <ExpoIcon />,
      description: "Universal React Native apps with file-based routing",
      disabled: false,
    }
  ];
  ```

#### 2.2 Project Recommendations Mobile Focus
- **File**: `frontend/src/components/features/home/project-recommendations.tsx`
- **Changes**:
  ```typescript
  // Update all sample recommendations to mobile-first
  const mobileRecommendations = [
    {
      id: "instagram-mobile",
      title: "Instagram Mobile Clone",
      description: "Photo sharing with stories, chat, and real-time features",
      image: "...",
      categoryId: "social",
    },
    {
      id: "spotify-mobile",
      title: "Spotify Mobile Clone",
      description: "Music streaming with playlists and offline support",
      image: "...",
      categoryId: "entertainment",
    },
    // ... more mobile-focused examples
  ];

  // Update clone messages to be Expo-specific
  const cloneMessage = `Create a mobile app like ${recommendation.title} using Expo Router`;
  ```

#### 2.3 App Store Integration Prominence
- **Elevate**: App Store search to primary project creation method
- **Update**: `frontend/src/components/features/app-store/app-store-modal.tsx`
- **Add**: Quick access buttons for popular mobile app categories

### Phase 3: Backend API & Project Detection Updates
**Timeline: Week 2**
**Priority: HIGH**

#### 3.1 Conversation Creation Defaults
- **File**: `openhands/server/routes/manage_conversations.py`
- **Changes**:
  ```python
  class InitSessionRequest(BaseModel):
      # ... existing fields ...
      framework: str = "expo-router"  # Default to expo-router
      mode: str = "AGENTIC"  # Default to agentic mode

      def __post_init__(self):
          # Validate framework is expo-router
          if self.framework and self.framework != "expo-router":
              logger.warning(f"Non-Expo framework requested: {self.framework}, defaulting to expo-router")
              self.framework = "expo-router"
  ```

#### 3.2 Project Detection Refinement
- **File**: `openhands/server/routes/project_detection.py`
- **Changes**:
  ```python
  # Enhance Expo detection patterns
  PROJECT_CONFIGS = {
      "EXPO": {
          "name": "Expo Router",
          "priority": 1,  # Highest priority
          "detectors": [
              {"type": "file", "pattern": "app.json", "weight": 5},
              {"type": "file", "pattern": "app/_layout.tsx", "weight": 10},  # Expo Router specific
              {"type": "file", "pattern": "app/index.tsx", "weight": 8},
              {"type": "dependency", "pattern": "expo-router", "weight": 10},
              {"type": "dependency", "pattern": "expo", "weight": 5},
              # Add React Native patterns
              {"type": "dependency", "pattern": "react-native", "weight": 7},
              {"type": "file", "pattern": "metro.config.js", "weight": 3},
          ]
      },
      # Keep other configs but with lower priority/weights
  }
  ```

#### 3.3 Repository Filtering Enhancement
- **File**: `openhands/integrations/github/github_service.py`
- **Add**: Mobile app repository detection
- **Enhance**: Repository search to prioritize mobile projects

### Phase 4: Route Management & UI Cleanup
**Timeline: Week 2-3**
**Priority: MEDIUM**

#### 4.1 Route Hiding Strategy
- **File**: `frontend/src/routes.ts`
- **Implementation**:
  ```typescript
  // Feature flags for route visibility
  const EXPO_ONLY_MODE = true;

  const routes = [
      // Always visible - core functionality
      { path: '/', element: <Home /> },
      { path: '/conversations/*', element: <Conversation /> },
      { path: '/settings', element: <AppSettings /> },
      { path: '/teams', element: <Teams /> },
      { path: '/billing', element: <Billing /> },

      // Conditionally hidden - non-mobile relevant
      ...(EXPO_ONLY_MODE ? [] : [
          { path: '/microagent-management', element: <MicroagentManagement /> },
          { path: '/jupyter-tab', element: <JupyterTab /> },
          { path: '/browser-tab', element: <BrowserTab /> },
      ]),
  ];
  ```

#### 4.2 Settings Cleanup
- **Files**: Various settings components
- **Changes**: Hide/disable non-mobile-relevant settings
  - Keep: LLM settings, API keys, user settings, teams, billing
  - Hide: Some MCP settings, web-specific configurations
  - Update: Default configurations for mobile development

### Phase 5: Enhanced Mobile Development Features
**Timeline: Week 3-4**
**Priority: MEDIUM**

#### 5.1 Expo Boilerplate Templates
- **Create**: `templates/expo/` directory structure
- **Templates**:
  ```
  templates/expo/
     social-media/          # Instagram-like template
     ecommerce/            # Shopping app template
     productivity/         # Todo/notes app template
     entertainment/        # Streaming app template
     finance/             # Banking app template
     default/             # Basic Expo Router setup
  ```

#### 5.2 Mobile App Pattern Microagents
- **Create**: Specialized microagents
  ```
  microagents/
     expo-navigation.md    # Navigation patterns
     expo-components.md    # Component library patterns
     expo-state.md        # State management with Zustand/MMKV
     expo-styling.md      # NativeWind best practices
     expo-deployment.md   # EAS Build and deployment
  ```

#### 5.3 Enhanced App Store Integration
- **File**: `frontend/src/components/features/app-store/app-store-modal.tsx`
- **Enhancements**:
  - Mobile app category filters
  - Screenshot analysis for UI patterns
  - Automatic Expo Router structure suggestion
  - Integration with project templates

### Phase 6: Documentation & User Experience
**Timeline: Week 4**
**Priority: LOW**

#### 6.1 User-Facing Messaging Updates
- **Landing Page**: Focus on mobile app development
- **Help Text**: Update all tooltips and guides for mobile context
- **Error Messages**: Guide users toward Expo solutions
- **Success Messages**: Celebrate mobile app milestones

#### 6.2 Claude.md Updates
- **File**: `CLAUDE.md`
- **Updates**:
  ```markdown
  # Expo Router Development Platform

  This platform specializes in Expo Router React Native development.

  ## Default Framework
  All projects use Expo Router. Framework selection is not available.

  ## Testing Commands
  - Frontend: `cd frontend && npm run test`
  - Mobile Preview: Use Expo Go app or custom Expo Go fork

  ## Pre-commit Requirements
  - Must pass Expo-specific linting
  - TypeScript compliance required
  - NativeWind class validation
  ```

## Technical Implementation Details

### Backend Changes

#### System Prompt Integration
```python
# openhands/agenthub/codeact_agent/agent.py
def _get_system_message(self) -> str:
    # Load Expo-specific system additions
    expo_context = self._load_expo_context()
    base_prompt = self._load_base_prompt()
    return f"{expo_context}\n\n{base_prompt}"
```

#### Conversation Metadata Enhancement
```python
# openhands/storage/data_models/conversation_metadata.py
class ConversationMetadata(BaseModel):
    # ... existing fields ...
    framework: str = "expo-router"
    project_type: str = "EXPO"
    mobile_platform_targets: List[str] = ["ios", "android", "web"]
    expo_sdk_version: Optional[str] = None
```

#### Repository Filtering
```python
# openhands/integrations/github/github_service.py
async def get_repositories(self, sort: str = 'pushed') -> List[Repository]:
    repos = await self._fetch_repositories(sort)

    # Filter for mobile-friendly repositories
    mobile_repos = []
    for repo in repos:
        if self._is_mobile_repository(repo):
            mobile_repos.append(repo)

    return self._prioritize_expo_repos(mobile_repos)

def _is_mobile_repository(self, repo: Repository) -> bool:
    mobile_keywords = ['mobile', 'app', 'react-native', 'expo', 'ios', 'android']
    return any(keyword in repo.description.lower() for keyword in mobile_keywords)
```

### Frontend Changes

#### Framework Enforcement
```typescript
// frontend/src/hooks/mutation/use-create-conversation.ts
export function useCreateConversation() {
  return useMutation({
    mutationFn: async (data: CreateConversationRequest) => {
      // Enforce Expo Router framework
      const expoData = {
        ...data,
        framework: "expo-router",
        mode: "AGENTIC",
      };

      return openHands.post<ConversationResponse>("/api/conversations", expoData);
    },
  });
}
```

#### Project Type Display
```typescript
// frontend/src/components/features/conversation/conversation-tabs.tsx
const getProjectTypeDisplay = (projectType: string) => {
  // Always show as mobile project
  return {
    icon: <MobileIcon />,
    label: "Mobile App",
    description: "Expo Router React Native Application",
  };
};
```

## Future-Proofing Strategy

### System Prompt Evolution Path

**Current Phase (Expo-Only)**:
- System prompt contains Qlur AI identity + critical Expo rules
- Microagents remain trigger-based for detailed guidance
- Zero extra token cost, maximum rule enforcement

**Future Phase (Multi-Framework)**:
- System prompt keeps Qlur AI identity + framework routing logic
- Framework-specific rules migrate to always-loaded microagents
- Acceptable token cost increase for multi-framework support

### Migration Strategy for Multi-Framework Support

#### Stage 1: Framework Detection Integration
```jinja2
<QLUR_AI_IDENTITY>
You are Qlur AI, an autonomous AI frontend engineer.

Based on user's project or request, determine the appropriate framework:
- Mobile apps, React Native, Expo → Use Expo Router expertise
- Web apps, SSR, Next.js → Use Next.js expertise  
- Backend, Laravel, PHP → Use Laravel expertise

Always maintain Qlur AI branding and autonomous AI identity.
</QLUR_AI_IDENTITY>
```

#### Stage 2: Rule Migration to Microagents
```python
# Future microagent loading logic
def get_framework_microagents(framework: str) -> List[str]:
    framework_map = {
        'expo-router': ['expo-core-rules', 'expo-patterns', 'expo-deployment'],
        'nextjs': ['nextjs-core-rules', 'nextjs-patterns', 'nextjs-deployment'],
        'laravel': ['laravel-core-rules', 'laravel-patterns', 'laravel-deployment']
    }
    return framework_map.get(framework, [])
```

### Code Organization Principles

1. **System Prompt Modularity**: Separate identity from framework rules
   ```jinja2
   # system_prompt.j2 structure for future
   {{ qlur_identity }}
   {% if framework_detected %}
     {{ framework_routing_logic }}
   {% else %}
     {{ critical_expo_rules }}  # Current single-framework approach
   {% endif %}
   ```

2. **Feature Flags**: Use environment variables for easy restoration
   ```typescript
   const EXPO_ONLY_MODE = process.env.EXPO_ONLY_MODE === 'true';
   ```

3. **Conditional Rendering**: Hide rather than delete components
   ```typescript
   {!EXPO_ONLY_MODE && <NextJsComponents />}
   ```

4. **Commenting Strategy**: Comment out imports and routes
   ```typescript
   // import { NextJsRoutes } from './nextjs-routes';  // Hidden in Expo-only mode
   ```

5. **Microagent Preservation Strategy**:
   
   **Current Approach**: Redirect existing microagents
   ```markdown
   # microagents/nextjs.md (current)
   I'm Qlur AI and I specialize exclusively in Expo Router apps now! 
   Let me help you build a mobile version instead.
   
   <!-- PRESERVED FOR FUTURE RESTORATION
   Original Next.js content here...
   -->
   ```
   
   **Future Restoration**: Uncomment and enhance
   ```markdown
   # microagents/nextjs.md (future)
   # Next.js Development Expert
   
   You are Qlur AI's Next.js specialist module...
   [Restored and enhanced content]
   ```

### Database Schema Preservation

```sql
-- Keep existing columns for future expansion
-- conversations table retains all framework columns
-- Add new mobile-specific columns without removing others
ALTER TABLE conversations
ADD COLUMN expo_sdk_version VARCHAR(50),
ADD COLUMN mobile_targets JSON;
```

### API Backward Compatibility

```python
# Maintain API contracts but default to Expo
class InitSessionRequest(BaseModel):
    framework: str = "expo-router"  # Default changed, field preserved

    @validator('framework')
    def validate_framework(cls, v):
        if v != "expo-router":
            logger.info(f"Framework {v} requested but only expo-router supported")
            return "expo-router"
        return v
```

## Success Metrics

### Quantitative Metrics

1. **User Engagement**
   - 100% of new conversations use Expo Router framework
   - Mobile app project creation increases by 300%
   - App Store cloning feature usage increases by 500%

2. **Development Efficiency**
   - Average time to first mobile app prototype: <30 minutes
   - User completion rate for mobile projects: >80%
   - Template usage rate: >70% of new projects

3. **Quality Metrics**
   - Generated apps run successfully on iOS/Android/Web: >95%
   - NativeWind styling compliance: 100%
   - TypeScript error-free projects: >90%

### Qualitative Metrics

1. **User Experience**
   - Clear, unambiguous mobile development workflow
   - No confusion about framework choices
   - Seamless app store to code pipeline

2. **Code Quality**
   - Consistent Expo Router patterns
   - Modern React Native best practices
   - Universal app compatibility

## Risk Assessment

### High Risk Items

1. **User Resistance to Change**
   - **Risk**: Existing users may resist loss of Next.js/Laravel support
   - **Mitigation**: Clear communication about mobile focus, offer migration support
   - **Contingency**: Feature flags allow quick rollback

2. **Technical Debt**
   - **Risk**: Hidden code paths may cause unexpected issues
   - **Mitigation**: Comprehensive testing, staged rollout
   - **Contingency**: Rollback plan with database migrations

### Medium Risk Items

1. **SEO/Marketing Impact**
   - **Risk**: Narrower focus may reduce search visibility
   - **Mitigation**: Target mobile development keywords, emphasize specialization
   - **Contingency**: Expand messaging while maintaining focus

2. **Integration Dependencies**
   - **Risk**: Third-party services may expect multiple frameworks
   - **Mitigation**: Update integration contracts, maintain flexibility
   - **Contingency**: Conditional integration loading

### Low Risk Items

1. **Performance Impact**
   - **Risk**: Additional checks may slow response time
   - **Mitigation**: Optimize hot paths, cache decisions
   - **Contingency**: Remove performance-impacting features

## Rollback Plan

### Emergency Rollback (< 1 hour)

1. **Environment Variable Toggle**
   ```bash
   export EXPO_ONLY_MODE=false
   # Restart services
   ```

2. **Frontend Feature Flag**
   ```typescript
   const EXPO_ONLY_MODE = false;  // Restore all routes and components
   ```

3. **Database Rollback**
   ```sql
   -- No destructive changes made, just defaults updated
   -- Reset conversation defaults if needed
   ```

### Staged Rollback (< 1 day)

1. **Restore Hidden Routes**: Uncomment route definitions
2. **Restore Microagents**: Remove redirection logic
3. **Restore System Prompts**: Revert to generic prompts
4. **Update Documentation**: Restore multi-framework messaging

### Full Rollback (< 1 week)

1. **Code Restoration**: Restore all commented/hidden code
2. **Database Migration**: Restore original defaults
3. **Testing Suite**: Run full regression tests
4. **User Communication**: Notify users of restoration

## Implementation Timeline

### Week 1: Core Transformation
- [ ] System prompt modifications
- [ ] Microagent updates
- [ ] Basic frontend changes (framework selection removal)
- [ ] Backend conversation creation defaults

### Week 2: Deep Integration
- [ ] Project detection enhancements
- [ ] Repository filtering
- [ ] App store integration improvements
- [ ] Route management cleanup

### Week 3: Enhanced Features
- [ ] Expo boilerplate templates
- [ ] Mobile-specific microagents
- [ ] Advanced app store features
- [ ] Settings optimization

### Week 4: Polish & Launch
- [ ] Documentation updates
- [ ] User experience testing
- [ ] Performance optimization
- [ ] Launch preparation

## Conclusion

This transformation plan provides a comprehensive roadmap to convert **Qlur AI** into a specialized Expo Router development platform. The approach balances:

- **Immediate Impact**: Quick wins through system prompt and UI changes
- **Technical Excellence**: Maintain code quality and architecture integrity
- **Future Flexibility**: Preserve ability to expand to other platforms
- **User Experience**: Create clear, focused development workflow

The phased approach allows for iterative delivery, risk mitigation, and user feedback incorporation. The emphasis on future-proofing ensures this transformation can be evolved or reversed as business needs change.

By focusing exclusively on Expo Router applications, **Qlur AI** will become the definitive autonomous AI frontend engineer for mobile app development, providing users with unparalleled expertise in React Native and mobile development best practices.
