# Expo Router Advanced Guidelines

## Complex Navigation Patterns

### Tab Navigation with Stack Nesting
```typescript
// app/(tabs)/_layout.tsx - Main tab container
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colorScheme === 'dark' ? '#fff' : '#2f95dc',
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
        }}
      />
    </Tabs>
  );
}

// app/(tabs)/explore/_layout.tsx - Nested stack in tab
import { Stack } from 'expo-router';

export default function ExploreLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Explore' }} />
      <Stack.Screen name="[id]" options={{ title: 'Details' }} />
    </Stack>
  );
}
```

### Dynamic Route Patterns
```typescript
// app/users/[userId]/posts/[postId].tsx
import { useLocalSearchParams } from 'expo-router';

export default function PostPage() {
  const { userId, postId } = useLocalSearchParams<{
    userId: string;
    postId: string;
  }>();

  return (
    <View>
      <Text>User: {userId}</Text>
      <Text>Post: {postId}</Text>
    </View>
  );
}

// Navigation to dynamic routes
<Link href={`/users/${user.id}/posts/${post.id}`}>
  View Post
</Link>

// Or programmatically
router.push(`/users/${user.id}/posts/${post.id}`);
```

### Route Groups and Shared Layouts
```typescript
// app/(authenticated)/_layout.tsx
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function AuthenticatedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
    </Stack>
  );
}

// app/(public)/_layout.tsx
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function PublicLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/dashboard" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
```

## Advanced Navigation Techniques

### Modal Presentations
```typescript
// app/modal.tsx
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

export default function Modal() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Modal Screen</Text>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

// Navigation to modal
<Link href="/modal" asChild>
  <Pressable>
    <Text>Present modal</Text>
  </Pressable>
</Link>

// Programmatic modal presentation
router.push('/modal');
```

### Navigation with Parameters
```typescript
// Type-safe navigation
interface SearchParams {
  query?: string;
  category?: string;
  sort?: 'newest' | 'oldest' | 'popular';
}

// app/search.tsx
export default function SearchPage() {
  const params = useLocalSearchParams<SearchParams>();

  return (
    <View>
      <Text>Query: {params.query}</Text>
      <Text>Category: {params.category}</Text>
      <Text>Sort: {params.sort}</Text>
    </View>
  );
}

// Navigation with typed parameters
const searchParams: SearchParams = {
  query: 'expo router',
  category: 'development',
  sort: 'newest'
};

router.push({
  pathname: '/search',
  params: searchParams
});
```

### Deep Linking Configuration
```typescript
// app.json
{
  "expo": {
    "scheme": "myapp",
    "web": {
      "bundler": "metro"
    },
    "plugins": [
      [
        "expo-router",
        {
          "origin": "https://myapp.com"
        }
      ]
    ]
  }
}

// Custom deep link handling
// app/+native-intent.tsx
import { router } from 'expo-router';

export default function NativeIntent() {
  // Handle unmatched routes
  router.replace('/');
  return null;
}
```

## Navigation Hooks and Utilities

### Custom Navigation Hooks
```typescript
// hooks/useTypedRouter.ts
import { router } from 'expo-router';

export function useTypedRouter() {
  return {
    pushToUser: (userId: string) => router.push(`/users/${userId}`),
    pushToPost: (userId: string, postId: string) =>
      router.push(`/users/${userId}/posts/${postId}`),
    goBack: () => router.back(),
    canGoBack: () => router.canGoBack(),
  };
}

// hooks/useNavigationState.ts
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';

export function useNavigationState() {
  const navigation = useNavigation();
  const [routeName, setRouteName] = useState<string>('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      // Track navigation state changes
      const state = e.data.state;
      if (state) {
        const currentRoute = state.routes[state.index];
        setRouteName(currentRoute.name);
      }
    });

    return unsubscribe;
  }, [navigation]);

  return { routeName };
}
```

### Navigation Guards
```typescript
// components/AuthGuard.tsx
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: string;
}

export function AuthGuard({ children, fallback = '/login' }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href={fallback} />;
  }

  return <>{children}</>;
}

// Usage in layouts
export default function ProtectedLayout() {
  return (
    <AuthGuard>
      <Stack>
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="settings" />
      </Stack>
    </AuthGuard>
  );
}
```

## Performance Optimization

### Route Preloading
```typescript
// Preload critical routes
import { router } from 'expo-router';

export function preloadCriticalRoutes() {
  // Preload routes that users commonly navigate to
  router.preload('/dashboard');
  router.preload('/profile');
  router.preload('/settings');
}

// Call during app initialization
useEffect(() => {
  preloadCriticalRoutes();
}, []);
```

### Lazy Loading Components
```typescript
// Lazy load heavy components
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('@/components/HeavyComponent'));

export default function LazyRoute() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Navigation Performance Tips
```typescript
// Optimize re-renders with useFocusEffect
import { useFocusEffect } from '@react-navigation/native';

export default function OptimizedScreen() {
  const [data, setData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      // Only fetch data when screen is focused
      fetchData().then(setData);
    }, [])
  );

  return <View>{/* Render data */}</View>;
}
```

## Error Handling and Fallbacks

### Not Found Pages
```typescript
// app/+not-found.tsx
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>This screen doesn't exist.</Text>
        <Link href="/" style={{ marginTop: 15, paddingVertical: 15 }}>
          <Text>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
```

### Error Boundaries for Navigation
```typescript
// components/NavigationErrorBoundary.tsx
import React from 'react';
import { router } from 'expo-router';

class NavigationErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Navigation error:', error, errorInfo);
    // Navigate to error page or home
    router.replace('/');
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Something went wrong with navigation.</Text>
          <Button title="Go Home" onPress={() => router.replace('/')} />
        </View>
      );
    }

    return this.props.children;
  }
}
```

This comprehensive routing guide covers advanced patterns, performance optimization, and error handling for Expo Router applications.
