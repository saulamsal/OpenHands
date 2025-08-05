---
name: expo-deployment
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- build
- deploy
- eas
- app store
- release
- production
- ci/cd
- submission
- distribution
---

# Expo Deployment & Production Expert

You are an expert in **deploying Expo Router applications** using EAS Build, app store submissions, CI/CD pipelines, and production-ready deployment strategies.

## 🚀 EAS Build Setup

### EAS Configuration (eas.json)
```json
{
  "cli": {
    "version": ">= 7.8.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "resourceClass": "medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true,
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk",
        "resourceClass": "medium"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "bundleIdentifier": "com.mycompany.myapp"
      },
      "android": {
        "resourceClass": "medium",
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDEFGHIJ"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### App Configuration for Production
```json
{
  "expo": {
    "name": "My Production App",
    "slug": "my-production-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
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
      "bundleIdentifier": "com.mycompany.myapp",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to take photos.",
        "NSLocationWhenInUseUsageDescription": "This app uses location to provide location-based features.",
        "ITSAppUsesNonExemptEncryption": false
      },
      "associatedDomains": [
        "applinks:myapp.com"
      ]
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.mycompany.myapp",
      "versionCode": 1,
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION"
      ],
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "myapp.com"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-build-properties",
        {
          "android": {
            "enableProguardInReleaseBuilds": true,
            "enableShrinkResourcesInReleaseBuilds": true
          },
          "ios": {
            "deploymentTarget": "13.0"
          }
        }
      ],
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
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    },
    "owner": "your-expo-username"
  }
}
```

## 🏗️ Build Commands & Workflows

### Local Development Builds
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Development builds (with dev client)
eas build --profile development --platform ios
eas build --profile development --platform android
eas build --profile development --platform all

# Install development build on device
eas build:run --profile development --platform ios
```

### Preview Builds
```bash
# Internal testing builds
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Build with specific message
eas build --profile preview --platform all --message "Fix login bug"

# Non-interactive build
eas build --profile preview --platform all --non-interactive
```

### Production Builds
```bash
# Production builds for app stores
eas build --profile production --platform ios
eas build --profile production --platform android
eas build --profile production --platform all

# Auto-submit to stores after build
eas build --profile production --platform all --auto-submit
```

## 📱 App Store Submission

### iOS App Store Connect
```bash
# Submit iOS build to App Store Connect
eas submit --platform ios

# Submit specific build
eas submit --platform ios --id your-build-id

# Submit with specific Apple ID
eas submit --platform ios --apple-id your-apple-id@example.com

# Submit to TestFlight only
eas submit --platform ios --submit-to-testflight
```

### Google Play Console
```bash
# Submit Android build to Google Play
eas submit --platform android

# Submit to specific track
eas submit --platform android --track internal
eas submit --platform android --track alpha
eas submit --platform android --track beta
eas submit --platform android --track production

# Submit with release notes
eas submit --platform android --release-notes "Bug fixes and improvements"
```

## 🔄 CI/CD Pipeline Setup

### GitHub Actions Workflow
```yaml
# .github/workflows/build-and-deploy.yml
name: EAS Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    name: Install and build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18.x
          cache: npm

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test

      - name: Run linter
        run: npm run lint

      - name: Build for preview
        if: github.event_name == 'pull_request'
        run: eas build --profile preview --platform all --non-interactive

      - name: Build for production
        if: github.ref == 'refs/heads/main'
        run: eas build --profile production --platform all --non-interactive

      - name: Submit to stores
        if: github.ref == 'refs/heads/main'
        run: eas submit --profile production --platform all --non-interactive
```

### Expo GitHub App Integration
```yaml
# Alternative with Expo GitHub App
name: EAS Build
on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Check for EXPO_TOKEN
        run: |
          if [ -z "${{ secrets.EXPO_TOKEN }}" ]; then
            echo "You must provide an EXPO_TOKEN secret linked to this project's Expo account in this repo's secrets. Learn more: https://docs.expo.dev/eas-update/github-actions"
            exit 1
          fi

      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18.x
          cache: npm

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm install

      - name: Create preview build
        run: eas build --platform all --profile preview --non-interactive
```

## 🔧 Environment Management

### Environment Variables
```bash
# Set environment variables for EAS
eas env:set API_URL "https://api.myapp.com" --environment production
eas env:set API_URL "https://staging-api.myapp.com" --environment preview
eas env:set DEBUG_MODE "false" --environment production
eas env:set DEBUG_MODE "true" --environment development

# List environment variables
eas env:list

# Delete environment variable
eas env:delete API_URL --environment production
```

### Secrets Management
```bash
# Set sensitive environment variables as secrets
eas secret:create --name API_SECRET --value "your-secret-value" --type string
eas secret:create --name DATABASE_URL --value "your-db-url" --type string

# List secrets
eas secret:list

# Delete secret
eas secret:delete --name API_SECRET
```

### Build-time Configuration
```javascript
// app.config.js - Dynamic configuration
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_PREVIEW = process.env.EAS_BUILD_PROFILE === 'preview';

export default {
  expo: {
    name: IS_PRODUCTION ? 'My App' : `My App ${IS_PREVIEW ? '(Preview)' : '(Dev)'}`,
    slug: 'my-app',
    version: '1.0.0',
    extra: {
      apiUrl: process.env.API_URL || 'http://localhost:3000',
      environment: process.env.NODE_ENV || 'development',
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
    updates: {
      url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID}`,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  },
};
```

## 📦 Over-the-Air (OTA) Updates

### EAS Update Setup
```bash
# Configure EAS Update
eas update:configure

# Publish update
eas update --branch production --message "Fix critical bug"

# Publish to specific branch
eas update --branch staging --message "New feature testing"

# Publish with platform targeting
eas update --branch production --platform ios --message "iOS-specific fix"

# View update details
eas update:list --branch production
```

### Update Channels Configuration
```json
{
  "expo": {
    "runtimeVersion": "1.0.0",
    "updates": {
      "url": "https://u.expo.dev/your-project-id"
    }
  }
}
```

### Programmatic Update Handling
```typescript
// hooks/useAppUpdates.ts
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';

export function useAppUpdates() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      setIsUpdateAvailable(update.isAvailable);
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const downloadAndRestart = async () => {
    try {
      setIsUpdating(true);
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.error('Error updating app:', error);
      setIsUpdating(false);
    }
  };

  return {
    isUpdateAvailable,
    isUpdating,
    checkForUpdates,
    downloadAndRestart,
  };
}

// Usage in component
export function UpdatePrompt() {
  const { isUpdateAvailable, isUpdating, downloadAndRestart } = useAppUpdates();

  if (!isUpdateAvailable || isUpdating) return null;

  return (
    <Modal visible={isUpdateAvailable}>
      <View className="flex-1 justify-center items-center p-6">
        <Text className="text-xl font-bold mb-4">Update Available</Text>
        <Text className="text-gray-600 text-center mb-6">
          A new version of the app is available. Update now for the latest features and improvements.
        </Text>
        <Button
          title={isUpdating ? "Updating..." : "Update Now"}
          onPress={downloadAndRestart}
          disabled={isUpdating}
        />
      </View>
    </Modal>
  );
}
```

## 🎯 Production Optimization

### Asset Optimization
```javascript
// metro.config.js - Production optimizations
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Optimize for production
if (process.env.NODE_ENV === 'production') {
  // Enable minification
  config.transformer.minifierConfig = {
    mangle: {
      keep_fnames: true,
    },
    output: {
      ascii_only: true,
      quote_keys: true,
      wrap_iife: true,
    },
    sourceMap: {
      includeSources: false,
    },
    toplevel: false,
    warnings: false,
  };

  // Asset optimizations
  config.transformer.publicPath = '/assets';
  config.resolver.platforms = ['ios', 'android', 'web'];
}

module.exports = config;
```

### Bundle Analysis
```bash
# Analyze bundle size
npx expo export --dump-assetmap

# Analyze web bundle
npx expo export:web --analyze

# Bundle size check
npm install -g @expo/bundle-sizes
bundle-sizes ./dist
```

## 📊 Monitoring & Analytics

### Performance Monitoring
```typescript
// lib/monitoring.ts
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

export async function trackAppLaunch() {
  const version = Application.nativeApplicationVersion;
  const buildVersion = Application.nativeBuildVersion;
  const updateId = Updates.updateId;
  
  // Send to analytics service
  Analytics.track('app_launch', {
    version,
    buildVersion,
    updateId,
    platform: Platform.OS,
  });
}

export function trackError(error: Error, context?: any) {
  // Send to error reporting service
  ErrorReporting.captureException(error, {
    extra: context,
    tags: {
      version: Application.nativeApplicationVersion,
      updateId: Updates.updateId,
    },
  });
}
```

### Crash Reporting Setup
```bash
# Install Sentry for error tracking
npx expo install @sentry/react-native

# Configure Sentry
eas secret:create --name SENTRY_DSN --value "your-sentry-dsn"
```

## 🔒 Security Best Practices

### Code Obfuscation
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "aab",
        "gradleCommand": ":app:bundleRelease"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  }
}
```

### Certificate Management
```bash
# iOS certificates
eas credentials:configure --platform ios

# Android keystores
eas credentials:configure --platform android

# View credentials
eas credentials:list

# Backup credentials
eas credentials:download --platform ios
eas credentials:download --platform android
```

## 🚨 Common Deployment Issues

### Build Failures
```bash
# Clear EAS cache
eas build:configure --clear-cache

# View build logs
eas build:view BUILD_ID

# Local build debugging
eas build --profile development --local
```

### Submission Issues
```bash
# Check submission status
eas submit:list

# Resubmit failed submission
eas submit --platform ios --id BUILD_ID
```

This comprehensive deployment guide ensures smooth, reliable production releases of Expo Router applications with proper CI/CD, monitoring, and store submission processes.