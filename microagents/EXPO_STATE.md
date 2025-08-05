---
name: expo-state
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- state
- zustand
- mmkv
- storage
- context
- global state
- data management
- persistence
- store
---

# Expo State Management Expert

You are an expert in **state management and data persistence** for Expo Router applications using modern patterns like Zustand, MMKV, and React Context.

## 🏗️ State Management Architecture

### State Management Stack
```typescript
// Recommended state management layers
1. **Zustand** - Global application state
2. **React Context** - Theme, auth, and app-wide settings  
3. **React Native MMKV** - Persistent storage
4. **Local useState** - Component-specific state
5. **TanStack Query** - Server state management
```

## 🗄️ Zustand Global State

### Basic Store Setup
```typescript
// stores/useAppStore.ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // App preferences
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  
  // UI state
  isLoading: boolean;
  activeTab: string;
  
  // Actions
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: string) => void;
  toggleNotifications: () => void;
  setLoading: (loading: boolean) => void;
  setActiveTab: (tab: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      theme: 'system',
      language: 'en',
      notifications: true,
      isLoading: false,
      activeTab: 'home',
      
      // Actions
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),
      
      setTheme: (theme) => set({ theme }),
      
      setLanguage: (language) => set({ language }),
      
      toggleNotifications: () => set((state) => ({ 
        notifications: !state.notifications 
      })),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setActiveTab: (activeTab) => set({ activeTab }),
      
      logout: () => set({ 
        user: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        theme: state.theme,
        language: state.language,
        notifications: state.notifications,
      }),
    }
  )
);

// Selectors for optimized re-renders
export const useUser = () => useAppStore((state) => state.user);
export const useTheme = () => useAppStore((state) => state.theme);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
```

### Feature-Specific Stores
```typescript
// stores/usePostsStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
}

interface PostsState {
  posts: Post[];
  selectedPost: Post | null;
  filter: 'all' | 'liked' | 'mine';
  searchQuery: string;
  
  // Actions
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  likePost: (id: string) => void;
  setSelectedPost: (post: Post | null) => void;
  setFilter: (filter: 'all' | 'liked' | 'mine') => void;
  setSearchQuery: (query: string) => void;
  
  // Computed
  filteredPosts: () => Post[];
}

export const usePostsStore = create<PostsState>()(
  subscribeWithSelector((set, get) => ({
    posts: [],
    selectedPost: null,
    filter: 'all',
    searchQuery: '',
    
    setPosts: (posts) => set({ posts }),
    
    addPost: (post) => set((state) => ({ 
      posts: [post, ...state.posts] 
    })),
    
    updatePost: (id, updates) => set((state) => ({
      posts: state.posts.map(post => 
        post.id === id ? { ...post, ...updates } : post
      )
    })),
    
    deletePost: (id) => set((state) => ({
      posts: state.posts.filter(post => post.id !== id),
      selectedPost: state.selectedPost?.id === id ? null : state.selectedPost
    })),
    
    likePost: (id) => set((state) => ({
      posts: state.posts.map(post => 
        post.id === id
          ? { 
              ...post, 
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1
            }
          : post
      )
    })),
    
    setSelectedPost: (selectedPost) => set({ selectedPost }),
    setFilter: (filter) => set({ filter }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    
    // Computed selector
    filteredPosts: () => {
      const { posts, filter, searchQuery } = get();
      let filtered = posts;
      
      // Apply filter
      if (filter === 'liked') {
        filtered = filtered.filter(post => post.isLiked);
      } else if (filter === 'mine') {
        const currentUser = useAppStore.getState().user;
        filtered = filtered.filter(post => post.author === currentUser?.id);
      }
      
      // Apply search
      if (searchQuery) {
        filtered = filtered.filter(post =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      return filtered;
    },
  }))
);

// Subscribe to changes for side effects
usePostsStore.subscribe(
  (state) => state.posts,
  (posts) => {
    // Sync with server, analytics, etc.
    console.log('Posts updated:', posts.length);
  }
);
```

## 💾 MMKV Storage Setup

### Storage Configuration
```typescript
// lib/storage.ts
import { MMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

// Create MMKV instances for different data types
export const storage = new MMKV({
  id: 'app-storage',
  encryptionKey: 'your-encryption-key', // Optional encryption
});

export const userStorage = new MMKV({
  id: 'user-storage',
  encryptionKey: 'user-encryption-key',
});

export const cacheStorage = new MMKV({
  id: 'cache-storage',
});

// Zustand storage adapter
export const mmkvStorage: StateStorage = {
  setItem: (name, value) => {
    return storage.set(name, value);
  },
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return storage.delete(name);
  },
};

// Typed storage helpers
export const StorageKeys = {
  USER_PREFERENCES: 'user_preferences',
  AUTH_TOKEN: 'auth_token',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  CACHED_DATA: 'cached_data',
} as const;

export function setStorageItem<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

export function getStorageItem<T>(key: string): T | null {
  const value = storage.getString(key);
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function removeStorageItem(key: string): void {
  storage.delete(key);
}

export function clearStorage(): void {
  storage.clearAll();
}

// Storage hooks
export function useStorageState<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    const stored = getStorageItem<T>(key);
    return stored !== null ? stored : initialValue;
  });

  const setValue = useCallback((value: T) => {
    setState(value);
    setStorageItem(key, value);
  }, [key]);

  return [state, setValue];
}
```

### Secure Storage for Sensitive Data
```typescript
// lib/secureStorage.ts
import * as SecureStore from 'expo-secure-store';

export const SecureStorageKeys = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  BIOMETRIC_KEY: 'biometric_key',
  USER_CREDENTIALS: 'user_credentials',
} as const;

export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error('Failed to save secure item:', error);
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error('Failed to get secure item:', error);
    return null;
  }
}

export async function removeSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error('Failed to remove secure item:', error);
  }
}

// Secure storage hook
export function useSecureStorage(key: string) {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSecureItem(key).then((storedValue) => {
      setValue(storedValue);
      setLoading(false);
    });
  }, [key]);

  const setSecureValue = useCallback(async (newValue: string | null) => {
    if (newValue === null) {
      await removeSecureItem(key);
    } else {
      await setSecureItem(key, newValue);
    }
    setValue(newValue);
  }, [key]);

  return [value, setSecureValue, loading] as const;
}
```

## ⚛️ React Context for App-Wide State

### Theme Context
```typescript
// contexts/ThemeContext.tsx
import React, { createContext, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '@/stores/useAppStore';

interface ThemeContextType {
  isDark: boolean;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
    muted: string;
    border: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const lightColors = {
  background: '#ffffff',
  foreground: '#000000',
  primary: '#3b82f6',
  secondary: '#6b7280',
  accent: '#f59e0b',
  muted: '#f3f4f6',
  border: '#e5e7eb',
};

const darkColors = {
  background: '#000000',
  foreground: '#ffffff',
  primary: '#60a5fa',
  secondary: '#9ca3af',
  accent: '#fbbf24',
  muted: '#1f2937',
  border: '#374151',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { theme, setTheme } = useAppStore();
  
  const isDark = theme === 'system' 
    ? systemColorScheme === 'dark'
    : theme === 'dark';
  
  const colors = isDark ? darkColors : lightColors;

  // Apply theme to status bar
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(colors.background);
      StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
    }
  }, [isDark, colors.background]);

  return (
    <ThemeContext.Provider value={{ isDark, theme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

### Auth Context
```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { getSecureItem, setSecureItem, removeSecureItem } from '@/lib/secureStorage';

interface AuthContextType {
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const { setUser, logout } = useAppStore();

  // Check for existing auth on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getSecureItem('auth_token');
      if (token) {
        // Validate token and get user data
        const userData = await validateToken(token);
        if (userData) {
          setUser(userData);
        } else {
          await removeSecureItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await setSecureItem('auth_token', data.token);
        setUser(data.user);
      } else {
        throw new Error(data.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await setSecureItem('auth_token', data.token);
        setUser(data.user);
      } else {
        throw new Error(data.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await removeSecureItem('auth_token');
    logout();
  };

  const refreshAuth = async () => {
    await checkAuthStatus();
  };

  return (
    <AuthContext.Provider value={{
      isLoading,
      signIn,
      signUp,
      signOut,
      refreshAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Validate token helper
async function validateToken(token: string) {
  try {
    const response = await fetch('/api/auth/validate', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}
```

## 🔄 State Synchronization Patterns

### Cross-Tab State Sync (Web)
```typescript
// hooks/useStateSync.ts
import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';

export function useStateSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-storage' && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          // Sync specific state changes
          useAppStore.setState(newState.state);
        } catch (error) {
          console.error('Failed to sync state:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
}
```

### Server State Sync
```typescript
// hooks/useServerSync.ts
import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { usePostsStore } from '@/stores/usePostsStore';

export function useServerSync() {
  const { user, isAuthenticated } = useAppStore();
  const { setPosts } = usePostsStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Set up real-time connection (WebSocket, SSE, etc.)
    const ws = new WebSocket('wss://api.myapp.com/sync');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'posts_updated':
          setPosts(data.posts);
          break;
        case 'user_updated':
          useAppStore.getState().setUser(data.user);
          break;
      }
    };

    return () => ws.close();
  }, [isAuthenticated, user?.id]);
}
```

## 🎯 State Management Best Practices

### Performance Optimization
```typescript
// Optimized selectors to prevent unnecessary re-renders
const useOptimizedUser = () => {
  return useAppStore(useCallback(
    (state) => ({
      name: state.user?.name,
      avatar: state.user?.avatar,
    }),
    []
  ));
};

// Memoized computed values
const useFilteredPosts = (filter: string) => {
  return usePostsStore(useCallback(
    (state) => state.posts.filter(post => 
      filter === 'all' || post.category === filter
    ),
    [filter]
  ));
};
```

### Error Handling
```typescript
// Store with error handling
interface AppStateWithErrors extends AppState {
  error: string | null;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppStateWithErrors>((set) => ({
  // ... other state
  error: null,
  
  setError: (error) => set({ error }),
  
  // Wrapped actions with error handling
  setUser: async (user) => {
    try {
      set({ user, isAuthenticated: !!user, error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },
}));
```

This comprehensive state management guide provides robust, scalable patterns for handling all types of state in Expo Router applications.