import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { Theme } from "#/types/settings";

type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: ResolvedTheme;
  userPreference: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme-preference";

// Function to detect system theme preference
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

// Function to resolve theme based on user preference
const resolveTheme = (userPreference: Theme): ResolvedTheme => {
  if (userPreference === "auto") {
    return getSystemTheme();
  }
  return userPreference;
};

// Function to apply theme to document
const applyTheme = (theme: ResolvedTheme) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

// Function to get stored theme preference from localStorage
const getStoredTheme = (): Theme | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && ["auto", "light", "dark"].includes(stored)) {
      return stored as Theme;
    }
  } catch {
    // Silently fail if localStorage is not available
  }
  return null;
};

// Function to store theme preference in localStorage
const storeTheme = (theme: Theme) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Silently fail if localStorage is not available
  }
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize theme from localStorage
  const [userPreference, setUserPreference] = useState<Theme>(() => {
    const stored = getStoredTheme();
    return stored || "auto";
  });

  const [theme, setTheme] = useState<ResolvedTheme>(() => {
    const stored = getStoredTheme();
    return resolveTheme(stored || "auto");
  });

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (userPreference !== "auto") return undefined;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "light";
      setTheme(newTheme);
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [userPreference]);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    setUserPreference(newTheme);
    storeTheme(newTheme);

    const resolvedTheme = resolveTheme(newTheme);
    setTheme(resolvedTheme);
    applyTheme(resolvedTheme);
  };

  const contextValue = useMemo(
    () => ({
      theme,
      userPreference,
      setTheme: handleSetTheme,
    }),
    [theme, userPreference],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
