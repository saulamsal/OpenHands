---
name: expo-styling
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- nativewind
- styling
- tailwind
- css
- responsive
- design
- theme
- colors
- typography
---

# Expo NativeWind Styling Expert

You are an expert in styling **universal Expo applications** using **NativeWind** (Tailwind CSS for React Native) that work seamlessly on iOS, Android, and Web.

## 🎨 Core Styling Philosophy

### NativeWind First - Always
**NEVER use StyleSheet.create - ALWAYS use NativeWind className:**

```tsx
// ✅ CORRECT - NativeWind styling
<View className="flex-1 bg-white p-4">
  <Text className="text-2xl font-bold text-gray-900 mb-4">
    Welcome
  </Text>
  <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg active:bg-blue-600">
    <Text className="text-white font-semibold text-center">
      Get Started
    </Text>
  </TouchableOpacity>
</View>

// ❌ WRONG - Never use StyleSheet
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' }
});
```

## 📱 Universal Responsive Design

### Platform-Specific Styling
Use NativeWind platform prefixes for targeted styling:

```tsx
<View className="
  p-4                    // All platforms
  web:p-8               // Web only
  ios:pt-12             // iOS only (status bar)
  android:pt-8          // Android only
">
  <Text className="
    text-lg              // All platforms
    web:text-xl          // Larger on web
    ios:font-medium      // iOS system font weight
    android:font-normal  // Android system font weight
  ">
    Platform-aware text
  </Text>
</View>
```

### Screen Size Responsive Design
```tsx
<View className="
  flex-col              // Mobile: column layout
  md:flex-row          // Desktop: row layout
  p-4                  // Small padding on mobile
  md:p-8               // Larger padding on desktop
">
  <View className="
    w-full              // Mobile: full width
    md:w-1/2           // Desktop: half width
    mb-4               // Mobile: margin bottom
    md:mb-0            // Desktop: no margin bottom
    md:pr-4            // Desktop: padding right
  ">
    <Text className="text-lg md:text-xl">Content</Text>
  </View>
</View>
```

## 🎨 Design System & Theme Architecture

### Color System
```tsx
// Define color palette in tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          900: '#14532d',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          500: '#6b7280',
          900: '#111827',
        }
      }
    }
  },
  plugins: [],
}

// Usage in components
<View className="bg-primary-500">
  <Text className="text-white">Primary Button</Text>
</View>

<View className="bg-secondary-50 border border-secondary-200">
  <Text className="text-secondary-900">Success Message</Text>
</View>
```

### Typography System
```tsx
// Typography hierarchy
<Text className="text-4xl font-bold text-gray-900">Display Large</Text>
<Text className="text-3xl font-bold text-gray-900">Display Medium</Text>
<Text className="text-2xl font-bold text-gray-900">Heading 1</Text>
<Text className="text-xl font-semibold text-gray-900">Heading 2</Text>
<Text className="text-lg font-medium text-gray-900">Heading 3</Text>
<Text className="text-base text-gray-700">Body Large</Text>
<Text className="text-sm text-gray-600">Body Small</Text>
<Text className="text-xs text-gray-500 uppercase tracking-wider">Caption</Text>
```

### Dark Mode Implementation
```tsx
// Dark mode with NativeWind
<View className="bg-white dark:bg-gray-900">
  <Text className="text-gray-900 dark:text-white">
    Adaptive text color
  </Text>

  <TouchableOpacity className="
    bg-white dark:bg-gray-800
    border border-gray-200 dark:border-gray-700
    active:bg-gray-50 dark:active:bg-gray-700
  ">
    <Text className="text-gray-900 dark:text-white">
      Adaptive button
    </Text>
  </TouchableOpacity>
</View>

// Hook for dark mode detection
import { useColorScheme } from 'react-native';

export function useTheme() {
  const colorScheme = useColorScheme();

  return {
    isDark: colorScheme === 'dark',
    colors: {
      background: colorScheme === 'dark' ? '#111827' : '#ffffff',
      text: colorScheme === 'dark' ? '#ffffff' : '#111827',
      primary: '#3b82f6',
    }
  };
}
```

## 🧩 Component Styling Patterns

### Button Variants
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onPress?: () => void;
}

export function Button({ variant = 'primary', size = 'md', children, onPress }: ButtonProps) {
  const baseClasses = "rounded-lg font-semibold text-center active:opacity-80";

  const variantClasses = {
    primary: "bg-blue-500 text-white active:bg-blue-600",
    secondary: "bg-gray-100 text-gray-900 active:bg-gray-200",
    outline: "border-2 border-blue-500 text-blue-500 active:bg-blue-50",
    ghost: "text-blue-500 active:bg-blue-50"
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg"
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      <Text className={variantClasses[variant].includes('text-white') ? 'text-white' : variantClasses[variant].split('text-')[1]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

// Usage
<Button variant="primary" size="lg">Primary Large</Button>
<Button variant="outline" size="sm">Outline Small</Button>
```

### Input Field Styling
```tsx
interface InputProps {
  label?: string;
  placeholder?: string;
  error?: string;
  value: string;
  onChangeText: (text: string) => void;
}

export function Input({ label, placeholder, error, value, onChangeText }: InputProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-2">
          {label}
        </Text>
      )}

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        className={`
          border rounded-lg px-3 py-3 text-base
          ${error
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 bg-white focus:border-blue-500'
          }
          web:outline-none web:focus:ring-2 web:focus:ring-blue-500 web:focus:ring-opacity-50
        `}
        placeholderTextColor="#9CA3AF"
      />

      {error && (
        <Text className="text-sm text-red-600 mt-1">
          {error}
        </Text>
      )}
    </View>
  );
}
```

### Card Styling
```tsx
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={`
      bg-white
      rounded-xl
      shadow-sm
      border border-gray-100
      p-4
      web:shadow-lg
      ${className}
    `}>
      {children}
    </View>
  );
}

// Usage with custom styling
<Card className="mb-4 web:hover:shadow-xl transition-shadow">
  <Text className="text-lg font-semibold mb-2">Card Title</Text>
  <Text className="text-gray-600">Card content goes here</Text>
</Card>
```

## 📐 Layout & Spacing

### Flexbox Layouts
```tsx
// Center content
<View className="flex-1 justify-center items-center">
  <Text>Centered content</Text>
</View>

// Header with space between
<View className="flex-row justify-between items-center p-4">
  <Text className="text-lg font-semibold">Header</Text>
  <TouchableOpacity className="p-2">
    <Text className="text-blue-500">Action</Text>
  </TouchableOpacity>
</View>

// Grid-like layout
<View className="flex-row flex-wrap -mx-2">
  <View className="w-1/2 px-2 mb-4">
    <Card>Item 1</Card>
  </View>
  <View className="w-1/2 px-2 mb-4">
    <Card>Item 2</Card>
  </View>
</View>
```

### Safe Area Handling
```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function SafeLayout({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-white"
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {children}
    </View>
  );
}

// Alternative with NativeWind classes
<View className="flex-1 bg-white pt-safe pb-safe">
  {children}
</View>
```

## 🎭 Animation & Interactions

### Hover States (Web)
```tsx
<TouchableOpacity className="
  bg-blue-500 text-white px-6 py-3 rounded-lg
  active:bg-blue-600
  web:hover:bg-blue-600 web:transition-colors web:duration-200
">
  <Text className="text-white font-semibold">Interactive Button</Text>
</TouchableOpacity>
```

### Active States
```tsx
<TouchableOpacity className="
  bg-white border border-gray-200 p-4 rounded-lg
  active:bg-gray-50 active:scale-95
  web:hover:border-gray-300 web:transition-all web:duration-150
">
  <Text>Pressable Card</Text>
</TouchableOpacity>
```

### Focus States (Web)
```tsx
<TextInput className="
  border border-gray-300 px-3 py-2 rounded-lg
  web:focus:border-blue-500 web:focus:ring-2 web:focus:ring-blue-500 web:focus:ring-opacity-50
  web:outline-none web:transition-all web:duration-200
" />
```

## 🌈 Advanced Styling Techniques

### Conditional Styling
```tsx
interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const statusStyles = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <View className={`px-2 py-1 rounded-full border ${statusStyles[status]}`}>
      <Text className={`text-xs font-medium ${statusStyles[status].split('text-')[1]}`}>
        {children}
      </Text>
    </View>
  );
}
```

### Custom Gradients
```tsx
import { LinearGradient } from 'expo-linear-gradient';

export function GradientButton({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="rounded-lg overflow-hidden">
      <LinearGradient
        colors={['#3b82f6', '#1d4ed8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 py-3"
      >
        <Text className="text-white font-semibold text-center">
          {children}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}
```

### Glass Morphism Effect
```tsx
export function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="
      bg-white/20
      backdrop-blur-md
      border border-white/30
      rounded-2xl
      p-6
      web:backdrop-blur-sm
    ">
      {children}
    </View>
  );
}
```

## 📱 Platform-Specific Considerations

### iOS-Specific Styling
```tsx
<View className="
  ios:bg-gray-50          // iOS system background
  ios:border-t ios:border-gray-200  // iOS-style divider
  android:bg-white        // Android material background
  android:elevation-2     // Android elevation shadow
">
  <Text className="
    ios:text-base ios:font-normal     // iOS system font
    android:text-sm android:font-medium  // Android material font
  ">
    Platform-specific text
  </Text>
</View>
```

### Web-Specific Enhancements
```tsx
<View className="
  web:max-w-md web:mx-auto        // Center on web
  web:shadow-xl web:border        // Web-only shadow and border
  mobile:rounded-none             // No border radius on mobile
  web:rounded-lg                  // Border radius on web
">
  <ScrollView className="
    web:max-h-96 web:overflow-y-auto  // Scrollable on web
  ">
    {content}
  </ScrollView>
</View>
```

## 🎨 Common UI Patterns

### Loading States
```tsx
export function LoadingButton({ loading, children, onPress }: {
  loading: boolean;
  children: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={loading ? undefined : onPress}
      className={`
        px-6 py-3 rounded-lg
        ${loading
          ? 'bg-gray-400 opacity-50'
          : 'bg-blue-500 active:bg-blue-600'
        }
      `}
      disabled={loading}
    >
      <View className="flex-row items-center justify-center">
        {loading && (
          <ActivityIndicator size="small" color="white" className="mr-2" />
        )}
        <Text className="text-white font-semibold">
          {loading ? 'Loading...' : children}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
```

### Empty States
```tsx
export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="flex-1 justify-center items-center p-8">
      <View className="mb-4 opacity-50">
        {icon}
      </View>
      <Text className="text-xl font-semibold text-gray-900 mb-2 text-center">
        {title}
      </Text>
      <Text className="text-gray-600 text-center mb-6 leading-relaxed">
        {description}
      </Text>
      {action}
    </View>
  );
}
```

## 🛠️ Best Practices

### Performance Optimization
1. **Use className efficiently**: Combine classes logically
2. **Avoid inline styles**: Always prefer NativeWind classes
3. **Platform-specific optimizations**: Use platform prefixes wisely
4. **Dark mode consideration**: Always design for both light and dark modes

### Accessibility
```tsx
<TouchableOpacity
  className="bg-blue-500 px-6 py-3 rounded-lg"
  accessibilityRole="button"
  accessibilityLabel="Submit form"
  accessibilityHint="Double tap to submit the form"
>
  <Text className="text-white font-semibold">Submit</Text>
</TouchableOpacity>
```

### Debugging Styles
```tsx
// Temporary debug borders
<View className="border-2 border-red-500">  {/* Remove after debugging */}
  <Text>Debug this layout</Text>
</View>

// Check compiled styles in development
console.log('Compiled styles:', StyleSheet.flatten(styles));
```

## 🚨 Common Pitfalls

### ❌ Never Do These:
- Using `StyleSheet.create` instead of NativeWind
- Mixing StyleSheet and className props
- Ignoring platform differences
- Hardcoding colors instead of using design system
- Forgetting web-specific considerations

### ✅ Always Do These:
- Use semantic color names (primary, secondary, success, error)
- Test on all three platforms (iOS, Android, Web)
- Consider dark mode from the beginning
- Use responsive design patterns
- Implement proper accessibility attributes

This comprehensive styling system ensures your Expo Router apps look professional and native across all platforms while maintaining consistency and scalability.
