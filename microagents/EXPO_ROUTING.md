---
name: expo
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- expo router
- routing
- links
- universal app
- expo-router
---

# Expo Router
# Expo Router Complete Cheat Sheet

## 🚀 Core Concepts

### File-Based Routing Rules
1. **All screens/pages are files inside `app/` directory**
2. **All pages have a URL** (universal deep-linking)
3. **First `index.tsx` is the initial route**
4. **Root `_layout.tsx` replaces App.jsx/tsx**
5. **Non-navigation components live outside `app/` directory**
6. **Built on React Navigation** (same options and styling)

---

## 📁 File Structure & Notation

### Static Routes
```
app/
├── index.tsx           → / (root/initial route)
├── about.tsx          → /about
├── home.tsx           → /home
└── profile/
    ├── index.tsx      → /profile
    └── settings.tsx   → /profile/settings
```

### Dynamic Routes (Square Brackets)
```
app/
├── user/
│   └── [id].tsx       → /user/123, /user/456
├── [userName].tsx     → /evanbacon, /expo
└── products/
    └── [productId]/
        └── index.tsx  → /products/abc123
```

### Route Groups (Parentheses - URL Invisible)
```
app/
├── (tabs)/            → Groups routes, doesn't affect URL
│   ├── index.tsx      → /
│   ├── feed.tsx       → /feed
│   └── profile.tsx    → /profile
└── (auth)/            → Another group
    ├── login.tsx      → /login
    └── register.tsx   → /register
```

### Special Files
```
app/
├── _layout.tsx        → Layout component (not a route)
├── +not-found.tsx     → 404 fallback
├── +html.tsx          → Custom HTML boilerplate (web)
└── +native-intent.tsx → Handle unmatched deep links
```

---

## 🧭 Navigation Methods

### 1. Imperative Navigation with `useRouter`
```jsx
import { useRouter } from 'expo-router';

export default function Page() {
  const router = useRouter();

  return (
    <Button
      title="Navigate"
      onPress={() => {
        router.navigate('/about');     // Navigate (push or unwind)
        router.push('/about');         // Always push new
        router.replace('/about');      // Replace current
        router.back();                 // Go back
      }}
    />
  );
}
```

### 2. Link Component
```jsx
import { Link } from 'expo-router';

// Basic Link
<Link href="/about">About</Link>

// Link with custom component (asChild)
<Link href="/profile" asChild>
  <Pressable>
    <Text>Go to Profile</Text>
  </Pressable>
</Link>

// Link with prefetching
<Link href="/about" prefetch>About</Link>
```

### 3. Relative Navigation
```jsx
// From current route, navigate relatively
<Link href="./article">Go to article</Link>        // Current directory
<Link href="../home">Go to parent/home</Link>      // Parent directory

router.navigate('./article');
router.navigate('../home');
```

---

## 🔗 Dynamic Routes & Parameters

### Linking to Dynamic Routes
```jsx
// Direct URL approach
<Link href="/user/bacon">View User</Link>

// Object approach with params
<Link href={{
  pathname: '/user/[id]',
  params: { id: 'bacon' }
}}>
  View User
</Link>

// Imperative with params
router.navigate({
  pathname: '/user/[id]',
  params: { id: 'bacon' }
});
```

### Query Parameters
```jsx
// In URL
<Link href="/users?limit=20">View Users</Link>

// In params object
<Link href={{
  pathname: '/users',
  params: { limit: 20 }
}}>
  View Users
</Link>
```

### Reading Parameters with `useLocalSearchParams`
```jsx
import { useLocalSearchParams } from 'expo-router';

export default function UserPage() {
  const { id, limit } = useLocalSearchParams();

  return (
    <View>
      <Text>User ID: {id}</Text>
      <Text>Limit: {limit}</Text>
    </View>
  );
}
```

### Updating Query Parameters
```jsx
// With Link (same URL, new params)
<Link href="/users?limit=50">Load More</Link>

// Imperatively
<Pressable onPress={() => router.setParams({ limit: 50 })}>
  <Text>Load More</Text>
</Pressable>
```

---

## 🏗️ Layout Files & Navigators

### Root Layout (`app/_layout.tsx`)
```jsx
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return <Stack />;
}
```

### Stack Navigator
```jsx
import { Stack } from 'expo-router';

export default function StackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[productId]"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
```

### Tab Navigator
```jsx
import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
```

### Slot Layout (No Navigator)
```jsx
import { Slot } from 'expo-router';

export default function Layout() {
  return (
    <>
      <Header />
      <Slot />  {/* Current child route renders here */}
      <Footer />
    </>
  );
}
```

---

## 🔄 Common Navigation Patterns

### 1. Tabs with Nested Stacks
```
app/
├── (tabs)/
│   ├── _layout.tsx          → Tabs navigator
│   ├── index.tsx            → Tab 1 (single page)
│   ├── feed/
│   │   ├── _layout.tsx      → Stack navigator
│   │   ├── index.tsx        → Feed home
│   │   └── [postId].tsx     → Individual post
│   └── settings.tsx         → Tab 3 (single page)
```

**Tabs Layout:**
```jsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
```

**Stack within Tab:**
```jsx
// app/(tabs)/feed/_layout.tsx
import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',  // Always load feed/index first
};

export default function FeedLayout() {
  return <Stack />;
}
```

### 2. Shared Routes Between Tabs
```
app/
├── (tabs)/
│   ├── _layout.tsx
│   ├── (feed)/
│   │   └── index.tsx
│   ├── (search)/
│   │   └── search.tsx
│   └── (feed,search)/       → Shared between groups
│       ├── _layout.tsx      → Shared layout
│       └── users/
│           └── [username].tsx → Shared user profile
```

**Usage:**
- Both `/feed` and `/search` tabs can navigate to `/users/evanbacon`
- Deep links to `/users/evanbacon` will show in the first group alphabetically (`feed`)

---

## 🔒 Protected Routes & Authentication

### Basic Protected Routes
```jsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { useAuthState } from '@/utils/authState';

export default function RootLayout() {
  const { isLoggedIn } = useAuthState();

  return (
    <Stack>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" />
      </Stack.Protected>

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="create-account" />
      </Stack.Protected>
    </Stack>
  );
}
```

### Conditional Tab Display
```jsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { useAuthState } from '@/utils/authState';

export default function TabsLayout() {
  const { isVip } = useAuthState();

  return (
    <Tabs>
      <Tabs.Screen name="index" />

      <Tabs.Protected guard={isVip}>
        <Tabs.Screen name="vip" />
      </Tabs.Protected>

      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
```

### Modal Authentication Overlay
```jsx
// app/(logged-in)/_layout.tsx
import { SafeAreaView, Modal } from 'react-native';
import { Stack } from 'expo-router';

export default function Layout() {
  const isAuthenticated = /* check auth */;

  return (
    <SafeAreaView>
      <Stack />
      <Modal visible={!isAuthenticated}>
        {/* Login UI */}
      </Modal>
    </SafeAreaView>
  );
}
```

---

## ↪️ Redirects & Initial Routes

### Redirect Component
```jsx
import { Redirect } from 'expo-router';

export default function Page() {
  return <Redirect href="/about" />;
}
```

### Setting Initial Routes
```jsx
// app/stack/_layout.tsx
export const unstable_settings = {
  initialRouteName: 'index',  // Always load this route first
};

export default function StackLayout() {
  return <Stack />;
}
```

### Using `withAnchor` for Deep Navigation
```jsx
// Ensures initial route is loaded when navigating into nested stack
<Link href="/stack/second" withAnchor>
  Go to Second (with stack/index loaded first)
</Link>
```

---

## 🔗 Deep Linking

### URL Patterns
```
Scheme: myapp://

app/about.tsx           → myapp://about
app/profile/index.tsx   → myapp://profile
app/users/[username].tsx → myapp://users/evanbacon
```

### Universal Links (HTTPS)
Configure in app config for `https://` URLs that open your app.

---

## 🎯 Advanced Hooks & Utilities

### `useLocalSearchParams()` - Get URL Parameters
```jsx
const { id, category, search } = useLocalSearchParams();
```

### `useRouter()` - Navigation Control
```jsx
const router = useRouter();

router.navigate('/path');    // Smart navigation
router.push('/path');        // Always push
router.replace('/path');     // Replace current
router.back();              // Go back
router.setParams({ key: 'value' }); // Update query params
```

### `useNavigation()` - React Navigation Hook
```jsx
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();

useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    // Screen focused
  });
  return unsubscribe;
}, [navigation]);
```

---

## 🎨 Styling & Options

### Screen Options (Same as React Navigation)
```jsx
<Stack.Screen
  name="profile"
  options={{
    title: 'User Profile',
    headerShown: false,
    presentation: 'modal',
    animation: 'slide_from_right'
  }}
/>
```

### Tab Options
```jsx
<Tabs.Screen
  name="home"
  options={{
    title: 'Home',
    tabBarIcon: ({ color, size }) => (
      <Icon name="home" color={color} size={size} />
    ),
    tabBarBadge: 3,
    href: null  // Hide tab conditionally
  }}
/>
```

---

## ⚡ Performance: Prefetching

### Link Prefetching
```jsx
<Link href="/about" prefetch>
  About (prefetched when rendered)
</Link>
```

**Limitations of prefetched screens:**
- Cannot use imperative router API
- Cannot update options with `useNavigation().setOptions()`
- Cannot listen to navigator events
- Navigation object updates when actually navigated to

---

## 🛠️ Best Practices

### 1. File Organization
```
app/                    → Routes only
├── (tabs)/
├── (auth)/
└── _layout.tsx

components/             → Reusable components
utils/                  → Utilities
hooks/                  → Custom hooks
types/                  → TypeScript types
```

### 2. Route Groups for Organization
- Use `(tabs)`, `(auth)`, `(admin)` to group related routes
- Groups don't affect URLs
- Great for conditional navigation

### 3. Nested Navigation Guidelines
- Only nest navigators when truly needed
- Stacks in tabs: common pattern
- Tabs in stacks: useful for modals over tabs

### 4. Deep Linking Strategy
- Set `initialRouteName` for proper back navigation
- Use `withAnchor` for deep navigation into nested stacks
- Test deep links thoroughly

---

## 🚨 Common Gotchas

1. **Route groups** `(name)` don't affect URLs
2. **Dynamic routes** `[param]` match any value
3. **Index files** represent default routes for directories
4. **Layout files** `_layout.tsx` are not routes themselves
5. **Plus files** `+not-found.tsx` have special meanings
6. **Non-route files** in `app/` will be treated as routes
7. **Prefetched screens** have navigation limitations
