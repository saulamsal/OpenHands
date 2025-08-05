---
name: expo-boilerplate
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- setup
- template
- boilerplate
- project structure
- initialization
- create project
- scaffold
---

# Expo Boilerplate & Project Setup Expert

You are an expert in setting up **production-ready Expo Router projects** with optimal boilerplate, project structure, and development environment configuration.

## 🚀 Quick Start Templates

### Minimal Setup (Development)
```bash
# Create new Expo project with router
npx create-expo-app@latest MyApp --template tabs@51

# Navigate to project
cd MyApp

# Install additional dependencies
npx expo install react-native-safe-area-context react-native-screens

# Start development server
npx expo start
```

### Production Setup (Recommended)
```bash
# Clone Qlur AI optimized template
git clone https://github.com/qlur-ai/expo-template.git MyApp
cd MyApp

# Install dependencies with force flag for NativeWind
npm install --force

# Set up environment
cp .env.example .env.local

# Start with tunnel for device testing
npx expo start --tunnel
```

## 📁 Optimal Project Structure

### Directory Organization
```
MyApp/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation group
│   │   ├── _layout.tsx    # Tab layout
│   │   ├── index.tsx      # Home tab
│   │   ├── explore.tsx    # Explore tab
│   │   └── profile.tsx    # Profile tab  
│   ├── (auth)/            # Auth flow group
│   │   ├── _layout.tsx    # Auth layout
│   │   ├── login.tsx      # Login screen
│   │   └── register.tsx   # Register screen
│   ├── _layout.tsx        # Root layout
│   ├── +not-found.tsx     # 404 page
│   └── modal.tsx          # Modal screen
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── index.ts      # Export all
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── hooks/                # Custom hooks
│   ├── useAuth.ts
│   ├── useStorage.ts
│   └── useTheme.ts
├── lib/                  # Utilities & config
│   ├── auth.ts
│   ├── storage.ts
│   ├── api.ts
│   └── utils.ts
├── constants/            # App constants
│   ├── Colors.ts
│   ├── Layout.ts
│   └── Api.ts
├── assets/               # Static assets
│   ├── images/
│   ├── fonts/
│   └── icons/
├── types/                # TypeScript types
│   ├── auth.ts
│   ├── api.ts
│   └── navigation.ts
├── app.json              # Expo configuration
├── package.json
├── tailwind.config.js    # NativeWind config
├── metro.config.js       # Metro bundler config
├── tsconfig.json         # TypeScript config
├── .env.example          # Environment template
├── .env.local            # Local environment (gitignored)
├── .gitignore
└── README.md
```

## ⚙️ Essential Configuration Files

### app.json (Expo Configuration)
```json
{
  "expo": {
    "name": "MyApp",
    "slug": "my-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.mycompany.myapp"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.mycompany.myapp"
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

### tailwind.config.js (NativeWind)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a8a',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          500: '#6b7280',
          900: '#111827',
        }
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'inter-medium': ['Inter-Medium', 'system-ui', 'sans-serif'],
        'inter-semibold': ['Inter-SemiBold', 'system-ui', 'sans-serif'],
        'inter-bold': ['Inter-Bold', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### metro.config.js (Metro Bundler)
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add web support
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.assetExts.push('bin');

module.exports = withNativeWind(config, { input: './global.css' });
```

### tsconfig.json (TypeScript)
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/lib/*": ["./lib/*"],
      "@/types/*": ["./types/*"],
      "@/constants/*": ["./constants/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

## 📦 Essential Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "react-native-safe-area-context": "4.10.0",
    "react-native-screens": "3.31.0",
    
    "@expo/vector-icons": "^14.0.0",
    "expo-constants": "~16.0.0",
    "expo-font": "~12.0.0",
    "expo-linking": "~6.3.0",
    "expo-splash-screen": "~0.27.0",
    "expo-status-bar": "~1.12.0",
    "expo-system-ui": "~3.0.0",
    
    "nativewind": "^2.0.11",
    "react-native-mmkv": "^2.12.0",
    "react-native-reanimated": "~3.10.0",
    "react-native-gesture-handler": "~2.16.0",
    
    "zustand": "^4.5.0",
    "@react-native-async-storage/async-storage": "1.23.0",
    "expo-haptics": "~13.0.0",
    "expo-blur": "~13.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.2.79",
    "@types/react-native": "~0.73.0",
    "@typescript-eslint/eslint-plugin": "^7.7.0",
    "@typescript-eslint/parser": "^7.7.0",
    "eslint": "^8.57.0",
    "eslint-config-expo": "^7.0.0",
    "tailwindcss": "3.3.2",
    "typescript": "~5.3.3"
  }
}
```

## 🎨 Base Component Library

### Root Layout (_layout.tsx)
```typescript
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    'Inter': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
```

### Tab Layout ((tabs)/_layout.tsx)
```typescript
import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### Global Styles (global.css)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
}

html {
  font-family: 'Inter', system-ui, sans-serif;
}

body {
  margin: 0;
  padding: 0;
}
```

## 🔧 Development Environment Setup

### Environment Variables (.env.example)
```bash
# API Configuration
API_BASE_URL=https://api.myapp.com
API_VERSION=v1

# Authentication
AUTH_DOMAIN=myapp.auth0.com
AUTH_CLIENT_ID=your_auth_client_id

# Third-party Services
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
ANALYTICS_KEY=your_analytics_key

# Feature Flags
ENABLE_DEBUG_MODE=false
ENABLE_ANALYTICS=true
```

### Package Scripts
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest --watchAll",
    "lint": "expo lint",
    "build": "eas build",
    "submit": "eas submit",
    "prebuild": "expo prebuild"
  }
}
```

## 🎯 Best Practices Checklist

### ✅ Project Setup
- [ ] Use TypeScript for type safety
- [ ] Configure NativeWind for styling
- [ ] Set up proper file-based routing structure
- [ ] Configure environment variables
- [ ] Set up proper asset organization
- [ ] Configure Metro for web support

### ✅ Code Organization
- [ ] Separate components by feature and type
- [ ] Use index files for clean imports
- [ ] Implement proper TypeScript types
- [ ] Create reusable custom hooks
- [ ] Organize utilities in lib directory

### ✅ Development Workflow
- [ ] Set up ESLint and Prettier
- [ ] Configure pre-commit hooks
- [ ] Set up testing framework
- [ ] Configure CI/CD pipeline
- [ ] Set up error reporting

### ✅ Performance
- [ ] Optimize images and assets
- [ ] Implement lazy loading where appropriate
- [ ] Use React.memo for expensive components
- [ ] Configure bundle splitting
- [ ] Optimize fonts and loading

## 🚨 Common Setup Issues & Solutions

### NativeWind Not Working
```bash
# Clean installation
rm -rf node_modules package-lock.json
npm install --force

# Verify metro.config.js has NativeWind configuration
# Check tailwind.config.js content paths
# Ensure global.css is imported in _layout.tsx
```

### TypeScript Path Aliases Not Resolving
```json
// Ensure tsconfig.json has correct baseUrl and paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Web Bundle Errors
```javascript
// Ensure metro.config.js has web platform support
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
```

This comprehensive boilerplate guide ensures rapid, production-ready Expo Router project setup with optimal structure and configuration.