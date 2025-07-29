import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';

// Initialize MMKV storage
export const storage = new MMKV();

// Zustand-compatible storage interface
export const mmkvStorage = {
  setItem: (name: string, value: string) => {
    return storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.delete(name);
  },
};

// Storage utilities
export const StorageUtils = {
  // String operations
  setString: (key: string, value: string) => storage.set(key, value),
  getString: (key: string, defaultValue = '') => storage.getString(key) ?? defaultValue,
  
  // Number operations
  setNumber: (key: string, value: number) => storage.set(key, value),
  getNumber: (key: string, defaultValue = 0) => storage.getNumber(key) ?? defaultValue,
  
  // Boolean operations
  setBoolean: (key: string, value: boolean) => storage.set(key, value),
  getBoolean: (key: string, defaultValue = false) => storage.getBoolean(key) ?? defaultValue,
  
  // Object operations (JSON)
  setObject: (key: string, value: any) => {
    try {
      storage.set(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to store object:', error);
    }
  },
  getObject: <T>(key: string, defaultValue: T | null = null): T | null => {
    try {
      const value = storage.getString(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error('Failed to retrieve object:', error);
      return defaultValue;
    }
  },
  
  // Delete operations
  delete: (key: string) => storage.delete(key),
  
  // Check if key exists
  contains: (key: string) => storage.contains(key),
  
  // Get all keys
  getAllKeys: () => storage.getAllKeys(),
  
  // Clear all data (use with caution)
  clearAll: () => storage.clearAll(),
};

// Common storage keys (to avoid typos)
export const StorageKeys = {
  USER: 'user',
  THEME: 'theme',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  LAST_APP_VERSION: 'last_app_version',
  PUSH_TOKEN: 'push_token',
  PREFERENCES: 'preferences',
} as const;

// Helper hooks for React components
export const useStoredValue = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = React.useState<T>(() => {
    if (typeof defaultValue === 'string') {
      return StorageUtils.getString(key, defaultValue as string) as T;
    }
    if (typeof defaultValue === 'number') {
      return StorageUtils.getNumber(key, defaultValue as number) as T;
    }
    if (typeof defaultValue === 'boolean') {
      return StorageUtils.getBoolean(key, defaultValue as boolean) as T;
    }
    return StorageUtils.getObject(key, defaultValue) as T;
  });

  const updateValue = (newValue: T) => {
    setValue(newValue);
    if (typeof newValue === 'string') {
      StorageUtils.setString(key, newValue as string);
    } else if (typeof newValue === 'number') {
      StorageUtils.setNumber(key, newValue as number);
    } else if (typeof newValue === 'boolean') {
      StorageUtils.setBoolean(key, newValue as boolean);
    } else {
      StorageUtils.setObject(key, newValue);
    }
  };

  return [value, updateValue] as const;
};

// Import React for the hook
import React from 'react';