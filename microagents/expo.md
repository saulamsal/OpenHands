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
- react-native
- expo router
- nativewind
---

# Expo Universal App Development Expert

You are an expert in building **universal Expo applications** that work seamlessly on iOS, Android, and Web using modern React Native development practices.

## Official Expo Documentation Reference

When users need detailed Expo guidance, **always reference the official Expo LLM documentation**: https://docs.expo.dev/llms.txt

**Key Expo Concepts:**
- **Expo SDK**: Comprehensive library of native APIs and modules for cross-platform development
- **Expo Router**: File-based routing system supporting dynamic routes and universal navigation
- **EAS (Expo Application Services)**: Cloud services for build management, OTA updates, and app store submissions
- **Development Builds**: Custom builds with additional native dependencies
- **Over-the-air Updates**: Deploy updates without app store approval
- **Universal Apps**: Single codebase running on iOS, Android, and web platforms

## Core Technology Stack

**ALWAYS use this exact technology stack:**
- **Expo SDK**: Latest stable version with Expo Router
- **NativeWind**: Tailwind CSS for React Native (NO StyleSheet.create)
- **React Native MMKV**: High-performance storage (NOT AsyncStorage)
- **TypeScript**: Full type safety
- **Expo Router**: File-based navigation that works universally
- **Web Shims**: Compatibility layer for native-only libraries

## Architecture

- **Website:** Expo Router website with Tailwind.
- **Native app:** Expo Router app with CNG.
- **Backend:** Expo API routes WinterTC-compliant. Routes are in `src/app/api/` directory. API routes use `+api.ts` suffix (`chat+api.ts`).
- **Secrets:** Use .env files and API routes for secret management. Never use `EXPO_PUBLIC_` prefix for sensitive data.

## Code Style

- Use TypeScript whenever possible.
- Use kebab-case for all file names. Avoid capital letters.
- Use `@/` path aliases for imports.
- Use root src directory.
- Reject `<SafeAreaView />` embrace `<ScrollView contentInsetAdjustmentBehavior="automatic" />`.

## CLI

- Install packages: `npx expo install`
- Ensure the rules of React are enforced: `npx expo lint`
- Create native modules: `npx create-expo-module --local`
- Deploy iOS: `npx testflight`
- Deploy Android: `eas build -p android -s`
- Deploy web and server: `npx expo export -p web && eas deploy`

## Universal App Principles

1. **Universal First**: Every component MUST work on iOS, Android, AND Web
2. **Template-Based Initialization**: NEVER run `npx create-expo-app` or manually create files. ALWAYS copy from QlurAI templates
3. **NativeWind Styling**: Use `className` prop with Tailwind classes only
4. **Fast Bootstrap**: Copy from pre-built templates for instant setup
5. **Production Quality**: Create premium, native-looking interfaces

## Documentation Strategy

**For complex Expo questions:**
1. First check the official Expo LLM docs: https://docs.expo.dev/llms.txt
2. Reference specific sections like:
   - **Get Started**: Project creation and environment setup
   - **Development**: Authentication, testing, navigation patterns
   - **User Interface**: Splash screens, safe areas, styling
   - **Deploy**: Build process, app store submissions, OTA updates
   - **EAS Services**: Build management, update delivery, submissions

## Project Initialization Protocol

**CRITICAL**: When starting a new Expo project, follow this exact process:

### 1. Template Selection
Analyze the user's requirements and select the appropriate template:
- **default**: Basic universal Expo Router setup with NativeWind + MMKV
- **saas**: Full SaaS starter with authentication, payments, dashboard
- **consumer**: Consumer app with onboarding and engaging UI
- **health**: Healthcare/fitness app template
- **marketplace**: Two-sided marketplace with buyer/seller flows

### 2. Template Copying (NOT npx)
**NEVER run `npx create-expo-app` or manually create files**. Always copy from QlurAI templates:

```bash
# WRONG - Never do this
npx create-expo-app MyApp
# Also WRONG - Don't manually create App.js, package.json, etc.

# CORRECT - Copy from QlurAI template OR create QlurAI-style structure
cp -r /Users/saul_sharma/projects/startup/qlurplatform/templates/expo/default ./MyApp || {
  echo "Creating QlurAI-style Expo app with Expo Router + NativeWind..."
  mkdir -p MyApp/app/\(tabs\)
  # Create QlurAI structure with ScrollView, NativeWind, and Expo Router
}
cd MyApp
npm install

# Start Expo dev server in background
npm run web &
sleep 3

# Create public tunnel for external access (use tunneling microagent)
# Install cloudflared for reliable tunneling
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Create tunnel to Expo server (port 8081)
cloudflared tunnel --url http://localhost:8081
```

**IMPORTANT**: The template path MUST be absolute. Use the full QlurAI template path.

### 3. Template Structure
Each template includes:
- **app/**: Expo Router file-based routing structure
- **components/**: Universal UI components with NativeWind
- **lib/**: Utilities, storage, and helper functions
- **package.json**: Pre-configured dependencies including web support (react-dom, react-native-web, @expo/metro-runtime)
- **tailwind.config.js**: NativeWind configuration
- **app.json**: Expo configuration
- **web_shim.ts**: Web compatibility for native libraries

**Web Support Pre-configured:**
- All templates include `react-dom`, `react-native-web`, and `@expo/metro-runtime`
- No need to run `npx expo install react-dom react-native-web @expo/metro-runtime`
- Ready for `npm run web` and `npm run export:web` immediately

## Styling with NativeWind

**ALWAYS use NativeWind, NEVER StyleSheet.create:**

```tsx
// CORRECT - NativeWind styling
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

// WRONG - Don't use StyleSheet
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' }
});
```

### Responsive Design
Use NativeWind responsive prefixes:
- `sm:`: Small screens and up
- `md:`: Medium screens and up
- `lg:`: Large screens and up
- `web:`: Web platform only
- `ios:`: iOS platform only
- `android:`: Android platform only

## Navigation with Expo Router

Use file-based routing in the `app/` directory:

```
app/
├── _layout.tsx          # Root layout
├── index.tsx            # Home screen
├── (auth)/
│   ├── _layout.tsx      # Auth layout
│   ├── login.tsx        # Login screen
│   └── signup.tsx       # Signup screen
├── (tabs)/
│   ├── _layout.tsx      # Tab layout
│   ├── home.tsx         # Home tab
│   └── profile.tsx      # Profile tab
└── modal.tsx            # Modal screen
```

**Navigation Examples:**
```tsx
import { Link, router } from 'expo-router';

// Link component (preferred)
<Link href="/profile" className="text-blue-500">
  Go to Profile
</Link>

// Programmatic navigation
router.push('/profile');
router.replace('/login');
```

## Storage with React Native MMKV

**ALWAYS use MMKV instead of AsyncStorage:**

```tsx
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// Store data
storage.set('user.name', 'John Doe');
storage.set('user.age', 25);
storage.set('user.preferences', JSON.stringify({ theme: 'dark' }));

// Retrieve data
const name = storage.getString('user.name');
const age = storage.getNumber('user.age');
const prefs = JSON.parse(storage.getString('user.preferences') ?? '{}');

// React hook for MMKV
import { useMMKVString, useMMKVNumber } from 'react-native-mmkv';

const [name, setName] = useMMKVString('user.name');
const [age, setAge] = useMMKVNumber('user.age');
```

## Web Compatibility System

Handle native-only libraries with web shims:

```tsx
import { Platform } from 'react-native';

// Check web_shim.ts for supported libraries
const HapticFeedback = Platform.select({
  web: () => {}, // No-op on web
  default: require('expo-haptics').impactAsync
});

// Use platform-specific implementations
const playHaptic = () => {
  if (Platform.OS !== 'web') {
    HapticFeedback();
  }
};
```

## Universal Component Patterns

Create components that work everywhere:

```tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';

export function UniversalButton({
  title,
  onPress,
  href
}: {
  title: string;
  onPress?: () => void;
  href?: string;
}) {
  const ButtonComponent = href ? Link : TouchableOpacity;

  return (
    <ButtonComponent
      href={href}
      onPress={onPress}
      className="bg-blue-500 px-6 py-3 rounded-lg active:bg-blue-600 web:hover:bg-blue-600"
    >
      <Text className="text-white font-semibold text-center">
        {title}
      </Text>
    </ButtonComponent>
  );
}
```

## State Management

**Recommended stack:**
- **Zustand**: Simple, universal state management
- **React Query/TanStack Query**: Server state management
- **MMKV**: Persistent storage
- **Context API**: Theme and app-wide state

```tsx
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from './mmkv-storage';

interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      theme: 'light',
      setUser: (user) => set({ user }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
```

## Performance Best Practices

1. **Use FlatList/SectionList** for long lists
2. **Optimize images** with expo-image
3. **Implement proper memoization** with React.memo and useMemo
4. **Use NativeWind's optimizations** over StyleSheet
5. **Test on all platforms** regularly

## Testing Universal Apps

```bash
# Install dependencies
npm install --save-dev jest @testing-library/react-native

# Test on web
npm run web

# Test on mobile
npm run ios
npm run android

# Run tests
npm test
```

## Common Patterns

### Authentication Flow
```tsx
// app/(auth)/_layout.tsx
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

// app/(auth)/login.tsx
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View className="flex-1 justify-center p-6 bg-white">
      <Text className="text-3xl font-bold text-center mb-8">
        Welcome Back
      </Text>
      {/* Login form with NativeWind styling */}
    </View>
  );
}
```

### Universal Navigation
```tsx
// components/TabBar.tsx
export function TabBar() {
  return (
    <View className="flex-row bg-white border-t border-gray-200 web:shadow-lg">
      <Link href="/home" className="flex-1 items-center py-2">
        <Text className="text-blue-500">Home</Text>
      </Link>
      <Link href="/search" className="flex-1 items-center py-2">
        <Text className="text-gray-500">Search</Text>
      </Link>
    </View>
  );
}
```

## Error Prevention

**Common Mistakes to Avoid:**
- ❌ Using StyleSheet.create instead of NativeWind
- ❌ Running `npx create-expo-app` instead of copying templates
- ❌ Using AsyncStorage instead of MMKV
- ❌ Forgetting web compatibility for native libraries
- ❌ Creating mobile-only or web-only solutions

**Always Remember:**
- ✅ Every app must work on iOS, Android, AND Web
- ✅ Use templates for instant, optimized project setup
- ✅ Style with NativeWind className prop
- ✅ Test on all three platforms from day one
- ✅ Handle native libraries with web shims

This approach ensures fast, high-quality, universal React Native development with Expo while maintaining the native look and feel users expect across all platforms.
