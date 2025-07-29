/**
 * Web Shim System for Universal Expo Apps
 * 
 * This file contains an array of native-only React Native libraries
 * that need web fallbacks. Metro/Babel can use this to provide empty objects
 * for web compatibility.
 */

// List of native libraries that need web shims (empty objects for web)
export const webShimLibraries = [
  'expo-haptics',
  'react-native-device-info',
  '@react-native-async-storage/async-storage',
  'react-native-keychain',
  'expo-secure-store',
  'expo-contacts',
  'expo-camera',
  'expo-location',
  'expo-notifications',
  'expo-biometrics',
  'react-native-share',
  'expo-calendar',
  'expo-media-library',
];

// Export for Metro/Babel configuration
export default webShimLibraries;