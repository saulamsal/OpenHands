# Backend Integration Guide for OpenHands FastAPI System

## Overview

This document outlines how to integrate keyword injection in the OpenHands FastAPI backend to ensure the Expo microagent is always activated for specialized development workflows.

## Implementation Strategy

### Current Architecture

```
User Input → Frontend → FastAPI Backend → OpenHands Server → AI Request → Microagent Activation → Response
```

### Modified Architecture with Keyword Injection

```
User Input → Frontend → Keyword Injection → FastAPI Backend → OpenHands Server → AI Request → Microagent Activation → Response  
```

## Backend Integration Points

### 1. OpenHands Server Integration

The keyword injection should be implemented in the OpenHands server where user messages are processed before being sent to the agent.

**Location**: `openhands/server/app.py` or message processing middleware

```python
from typing import Optional
import re

class FrameworkService:
    """Service for detecting and injecting framework keywords"""
    
    def __init__(self):
        self.mobile_keywords = [
            'mobile app', 'ios', 'android', 'react native', 
            'universal app', 'cross-platform', 'mobile'
        ]
        self.web_keywords = [
            'website', 'web app', 'dashboard', 'landing page',
            'nextjs', 'web', 'seo', 'blog'
        ]
    
    def process_message(self, user_message: str, context: dict = None) -> str:
        """
        Process user message and inject framework keywords
        """
        # Determine framework based on message content
        framework = self.determine_framework(user_message, context or {})
        
        # Inject keyword to activate appropriate microagent
        enhanced_message = self.inject_framework_keyword(framework, user_message)
        
        return enhanced_message
    
    def determine_framework(self, message: str, context: dict) -> str:
        """
        Determine which framework to use based on message analysis
        """
        # Phase 1: Always use Expo for QlurAI specialization
        return 'expo'
        
        # Phase 2: Smart detection (future implementation)
        """
        message_lower = message.lower()
        
        # Check for mobile keywords
        for keyword in self.mobile_keywords:
            if keyword in message_lower:
                return 'expo'
        
        # Check for web keywords  
        for keyword in self.web_keywords:
            if keyword in message_lower:
                return 'nextjs'
        
        # Default to expo for QlurAI specialization
        return 'expo'
        """
    
    def inject_framework_keyword(self, framework: str, message: str) -> str:
        """
        Inject framework keyword into user message
        """
        # Seamlessly inject keyword without user awareness
        return f"{framework} {message}"

# Global service instance
framework_service = FrameworkService()
```

### 2. Message Handler Integration

**Location**: `openhands/server/app.py` - modify message handling

```python
from openhands.events.action import MessageAction
from openhands.events.event import EventSource

# In the websocket message handler
async def handle_user_message(websocket, data):
    """Handle incoming user messages with framework injection"""
    
    try:
        user_message = data.get('message', '')
        if not user_message:
            return
        
        # Apply framework keyword injection
        enhanced_message = framework_service.process_message(user_message)
        
        # Create message action with enhanced prompt
        action = MessageAction(
            content=enhanced_message,
            source=EventSource.USER
        )
        
        # Send to agent controller
        await controller.add_action(action)
        
        # Log framework detection for analytics
        await log_framework_usage('expo', user_message, websocket.user_id)
        
    except Exception as e:
        logger.error(f"Error processing user message: {e}")
        await websocket.send_error("Failed to process message")
```

### 3. Frontend Integration

**Location**: `frontend/src/services/chat-service.ts`

```typescript
// Frontend just sends messages normally - injection happens in backend
class ChatService {
  async sendMessage(message: string): Promise<void> {
    // Send via websocket to OpenHands backend
    this.websocket.send({
      action: 'message',
      message: message, // Backend will inject 'expo' keyword automatically
    });
  }
  
  // Optional: Add UI indicators for framework specialization
  showFrameworkIndicator() {
    // Show that QlurAI is specialized for Expo development
    this.showExpoSpecializationBadge();
  }
}
```

## Configuration Management

### 1. Environment Variables

```bash
# .env
FRAMEWORK_STRATEGY=specialized  # Options: specialized, smart, manual
DEFAULT_FRAMEWORK=expo          # Default framework for specialized mode
ENABLE_KEYWORD_INJECTION=true   # Toggle for keyword injection
```

### 2. Configuration File

**Location**: `openhands/core/config/framework_config.py`

```python
from typing import Literal
from pydantic import BaseModel

class FrameworkConfig(BaseModel):
    """Configuration for framework detection and injection"""
    
    strategy: Literal["specialized", "smart", "manual"] = "specialized"
    default_framework: str = "expo"
    enable_injection: bool = True
    
    # Detection settings
    confidence_threshold: float = 0.7
    fallback_framework: str = "expo"
    
    # Template settings
    templates_path: str = "templates"
    
    @classmethod
    def from_env(cls) -> "FrameworkConfig":
        """Create config from environment variables"""
        import os
        return cls(
            strategy=os.getenv("FRAMEWORK_STRATEGY", "specialized"),
            default_framework=os.getenv("DEFAULT_FRAMEWORK", "expo"),
            enable_injection=os.getenv("ENABLE_KEYWORD_INJECTION", "true").lower() == "true",
        )
```

## Framework Detection Logic

### Phase 1: Always Expo (Current)

```php
class FrameworkDetector 
{
    public function detect(string $prompt, array $context = []): string 
    {
        // For QlurAI specialization, always return expo
        return 'expo';
    }
}
```

### Phase 2: Smart Detection (Future)

```php
class FrameworkDetector 
{
    private array $frameworkKeywords = [
        'expo' => [
            'mobile app', 'ios app', 'android app', 'react native',
            'universal app', 'cross-platform', 'expo', 'mobile'
        ],
        'nextjs' => [
            'website', 'web app', 'dashboard', 'landing page',
            'nextjs', 'web', 'seo', 'blog'
        ],
        'react' => [
            'component library', 'ui components', 'design system',
            'react components', 'storybook'
        ]
    ];
    
    public function detect(string $prompt, array $context = []): string 
    {
        $prompt = strtolower($prompt);
        $scores = [];
        
        foreach ($this->frameworkKeywords as $framework => $keywords) {
            $scores[$framework] = 0;
            foreach ($keywords as $keyword) {
                if (strpos($prompt, $keyword) !== false) {
                    $scores[$framework]++;
                }
            }
        }
        
        // Return framework with highest score, default to expo
        $bestFramework = array_keys($scores, max($scores))[0] ?? 'expo';
        return $bestFramework ?: 'expo';
    }
}
```

## Monitoring and Analytics

### 1. Framework Usage Tracking

```php
class FrameworkAnalytics 
{
    public function trackFrameworkUsage(string $framework, string $prompt, string $userId) 
    {
        DB::table('framework_usage')->insert([
            'user_id' => $userId,
            'framework' => $framework,
            'prompt_length' => strlen($prompt),
            'detected_keywords' => $this->extractKeywords($prompt),
            'created_at' => now(),
        ]);
    }
    
    public function getFrameworkStats(): array 
    {
        return DB::table('framework_usage')
            ->select('framework', DB::raw('COUNT(*) as usage_count'))
            ->groupBy('framework')
            ->get()
            ->toArray();
    }
}
```

### 2. Template Usage Analytics

```php
class TemplateAnalytics 
{
    public function trackTemplateUsage(string $template, string $framework) 
    {
        DB::table('template_usage')->insert([
            'template' => $template,
            'framework' => $framework,
            'created_at' => now(),
        ]);
    }
    
    public function getPopularTemplates(): array 
    {
        return DB::table('template_usage')
            ->select('template', 'framework', DB::raw('COUNT(*) as usage_count'))
            ->groupBy('template', 'framework')
            ->orderBy('usage_count', 'desc')
            ->limit(10)
            ->get()
            ->toArray();
    }
}
```

## Testing Strategy

### 1. Unit Tests

```php
class FrameworkDetectionTest extends TestCase 
{
    public function test_expo_detection() 
    {
        $detector = new FrameworkDetector();
        
        $prompts = [
            'Create a mobile app for iOS and Android',
            'Build a universal app with React Native',
            'I need an expo app with navigation',
        ];
        
        foreach ($prompts as $prompt) {
            $this->assertEquals('expo', $detector->detect($prompt));
        }
    }
    
    public function test_keyword_injection() 
    {
        $service = new AIService();
        $prompt = 'Build a social media app';
        $enhanced = $service->processPrompt($prompt);
        
        $this->assertStringContains('expo', $enhanced);
        $this->assertStringContains($prompt, $enhanced);
    }
}
```

### 2. Integration Tests

```php
class ChatFlowTest extends TestCase 
{
    public function test_chat_with_keyword_injection() 
    {
        $response = $this->postJson('/api/chat/send', [
            'message' => 'Create a todo app'
        ]);
        
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'message',
            'framework'
        ]);
        $response->assertJson([
            'framework' => 'expo'
        ]);
    }
}
```

## Security Considerations

### 1. Input Validation

```php
class PromptValidator 
{
    public function validate(string $prompt): bool 
    {
        // Prevent injection attacks
        if (strlen($prompt) > 10000) {
            throw new InvalidArgumentException('Prompt too long');
        }
        
        // Check for malicious patterns
        $maliciousPatterns = [
            '/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mi',
            '/javascript:/i',
            '/data:text\/html/i',
        ];
        
        foreach ($maliciousPatterns as $pattern) {
            if (preg_match($pattern, $prompt)) {
                throw new SecurityException('Malicious content detected');
            }
        }
        
        return true;
    }
}
```

### 2. Rate Limiting

```php
// In routes/api.php
Route::middleware(['throttle:60,1'])->group(function () {
    Route::post('/chat/send', [ChatController::class, 'send']);
});
```

## Deployment Configuration

### 1. Environment-Specific Settings

```php
// config/framework.php
return [
    'strategy' => env('FRAMEWORK_STRATEGY', 'specialized'),
    'default' => env('DEFAULT_FRAMEWORK', 'expo'),
    'injection' => [
        'enabled' => env('ENABLE_KEYWORD_INJECTION', true),
        'position' => env('KEYWORD_POSITION', 'prefix'), // prefix, suffix, smart
    ],
    'detection' => [
        'confidence_threshold' => env('DETECTION_CONFIDENCE', 0.7),
        'fallback_framework' => env('FALLBACK_FRAMEWORK', 'expo'),
    ],
];
```

### 2. Cache Configuration

```php
class FrameworkCache 
{
    public function cacheFrameworkDetection(string $promptHash, string $framework) 
    {
        Cache::put("framework_detection:{$promptHash}", $framework, 3600);
    }
    
    public function getCachedDetection(string $promptHash): ?string 
    {
        return Cache::get("framework_detection:{$promptHash}");
    }
}
```

## Benefits of This Approach

1. **Seamless User Experience**: Users don't need to remember keywords
2. **Always Specialized**: Every request gets Expo expertise
3. **Future-Proof**: Easy to add new frameworks
4. **Minimal Changes**: Only backend modifications needed
5. **Trackable**: Full analytics on framework usage
6. **Configurable**: Easy to adjust detection logic

## Future Enhancements

1. **Machine Learning Detection**: Train models on user prompts for better framework detection
2. **Context Awareness**: Use project history and user preferences for smarter detection
3. **Multi-Framework Projects**: Support mixing frameworks in complex projects
4. **Custom Keywords**: Allow users to define their own trigger words
5. **A/B Testing**: Test different injection strategies for optimal results

This backend integration ensures that QlurAI provides specialized Expo development expertise by default while maintaining flexibility for future expansion to other frameworks.