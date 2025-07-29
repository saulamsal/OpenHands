# QlurAI Universal Expo App Template

A production-ready universal Expo application template built with modern React Native development practices.

## ✨ Features

- **🌐 Universal**: Works on iOS, Android, and Web
- **🎨 NativeWind**: Tailwind CSS for React Native styling
- **🧭 Expo Router**: File-based navigation
- **💾 MMKV Storage**: High-performance storage solution
- **🏪 Zustand**: Simple state management
- **⚡ React Query**: Server state management
- **🔧 TypeScript**: Full type safety
- **🌓 Dark Mode**: Built-in theme switching
- **📱 Responsive**: Adaptive layouts for all screen sizes

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platforms
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser
```

## 📁 Project Structure

```
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home screen
│   ├── (tabs)/           # Tab navigation
│   └── modal.tsx         # Modal screen
├── lib/                   # Utilities and configuration
│   ├── store.ts          # Zustand store
│   ├── storage.ts        # MMKV storage utilities
│   └── shims.ts          # Web compatibility shims
├── global.css            # Global styles
├── tailwind.config.js    # NativeWind configuration
└── app.json             # Expo configuration
```

## 🎨 Styling with NativeWind

This template uses NativeWind for styling, which provides Tailwind CSS classes for React Native:

```tsx
// ✅ Correct - Use className with Tailwind classes
<View className="flex-1 bg-white p-4">
  <Text className="text-2xl font-bold text-gray-900">
    Welcome!
  </Text>
</View>

// ❌ Avoid - Don't use StyleSheet.create
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' }
});
```

### Responsive Design

Use responsive prefixes for different screen sizes:

```tsx
<View className="p-4 md:p-8 lg:p-12">
  <Text className="text-lg md:text-xl lg:text-2xl">
    Responsive text
  </Text>
</View>
```

### Platform-Specific Styles

```tsx
<View className="bg-blue-500 ios:bg-blue-600 android:bg-blue-400 web:bg-blue-300">
  <Text className="text-white web:text-gray-900">
    Platform-specific styling
  </Text>
</View>
```

## 🧭 Navigation

This template uses Expo Router for navigation:

```tsx
import { Link, router } from 'expo-router';

// Using Link component
<Link href="/profile" className="text-blue-500">
  Go to Profile
</Link>

// Programmatic navigation
router.push('/profile');
router.replace('/login');
```

## 💾 Storage

The template includes MMKV for high-performance storage:

```tsx
import { StorageUtils } from '../lib/storage';

// Store data
StorageUtils.setString('username', 'john_doe');
StorageUtils.setNumber('score', 100);
StorageUtils.setBoolean('notifications', true);
StorageUtils.setObject('user', { id: 1, name: 'John' });

// Retrieve data
const username = StorageUtils.getString('username');
const score = StorageUtils.getNumber('score');
const notifications = StorageUtils.getBoolean('notifications');
const user = StorageUtils.getObject('user');
```

## 🏪 State Management

Global state is managed with Zustand:

```tsx
import { useAppStore } from '../lib/store';

export default function MyComponent() {
  const { user, theme, setUser, setTheme } = useAppStore();
  
  return (
    <View>
      <Text>Current theme: {theme}</Text>
      <Button onPress={() => setTheme('dark')}>
        Switch to Dark
      </Button>
    </View>
  );
}
```

## 🌐 Web Compatibility

The template includes web shims for native-only libraries:

```tsx
import { HapticFeedback, SecureStorage } from '../lib/shims';

// Works on all platforms
HapticFeedback.impact('medium');
SecureStorage.setItem('token', 'abc123');
```

## 🔧 TypeScript

The template is fully typed with TypeScript. Key type definitions:

```tsx
// User type
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

// Storage utilities are fully typed
const user = StorageUtils.getObject<User>('user');
```

## 📱 Testing

```bash
# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🚀 Building for Production

```bash
# Build for all platforms
npm run build

# Platform-specific builds
eas build --platform ios
eas build --platform android
eas build --platform web
```

## 🎯 Best Practices

1. **Always test on all three platforms** (iOS, Android, Web)
2. **Use NativeWind for styling** instead of StyleSheet
3. **Leverage web shims** for native-only libraries
4. **Follow TypeScript best practices** for type safety
5. **Use MMKV for storage** instead of AsyncStorage
6. **Implement proper error boundaries** for production apps

## 📚 Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [Expo Router Documentation](https://expo.github.io/router/)
- [MMKV Documentation](https://github.com/mrousavy/react-native-mmkv)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

## 🤝 Contributing

This template is part of the QlurAI platform. For issues or improvements, please refer to the main QlurAI repository.

## 📄 License

MIT License - Built with ❤️ by QlurAI