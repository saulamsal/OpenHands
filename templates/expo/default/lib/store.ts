import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from './storage';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface AppState {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Theme state
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  
  // App settings
  notifications: boolean;
  setNotifications: (enabled: boolean) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      theme: 'light',
      notifications: true,
      isLoading: false,
      
      // Actions
      setUser: (user) => set({ user }),
      setTheme: (theme) => set({ theme }),
      setNotifications: (notifications) => set({ notifications }),
      setIsLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'app-storage', // unique name
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist certain fields
      partialize: (state) => ({
        user: state.user,
        theme: state.theme,
        notifications: state.notifications,
      }),
    }
  )
);

// Selectors for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useTheme = () => useAppStore((state) => state.theme);
export const useNotifications = () => useAppStore((state) => state.notifications);