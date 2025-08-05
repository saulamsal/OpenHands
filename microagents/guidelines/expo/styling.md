# Expo Styling Advanced Guidelines

## Advanced NativeWind Patterns

### Complex Responsive Layouts
```typescript
// Advanced responsive grid system
export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  return (
    <View className="
      flex-row flex-wrap -mx-2
      sm:mx-0 sm:gap-4
      lg:gap-6
    ">
      {React.Children.map(children, (child, index) => (
        <View className="
          w-full px-2 mb-4
          sm:w-1/2 sm:px-0
          md:w-1/3
          lg:w-1/4
          xl:w-1/5
        ">
          {child}
        </View>
      ))}
    </View>
  );
}

// Dynamic column system
export function DynamicColumns({ 
  items, 
  renderItem,
  minColumnWidth = 300 
}: {
  items: any[];
  renderItem: (item: any) => React.ReactNode;
  minColumnWidth?: number;
}) {
  const { width } = useWindowDimensions();
  const columns = Math.floor(width / minColumnWidth) || 1;
  
  return (
    <View className="flex-row">
      {Array.from({ length: columns }, (_, columnIndex) => (
        <View key={columnIndex} className={`flex-1 ${columnIndex > 0 ? 'ml-4' : ''}`}>
          {items
            .filter((_, index) => index % columns === columnIndex)
            .map((item, index) => (
              <View key={index} className="mb-4">
                {renderItem(item)}
              </View>
            ))}
        </View>
      ))}
    </View>
  );
}
```

### Advanced Theme System
```typescript
// Theme provider with context
interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows: {
    sm: ViewStyle;
    md: ViewStyle;
    lg: ViewStyle;
  };
}

const lightTheme: Theme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    primary: '#60A5FA',
    secondary: '#9CA3AF',
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
  },
};

// Theme context
const ThemeContext = createContext<{
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');

  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### Dynamic Styling Utilities
```typescript
// Style composition utilities
export function createStyleSheet<T extends Record<string, string>>(
  styles: T,
  theme: Theme
): T {
  const compiledStyles = {} as T;
  
  Object.entries(styles).forEach(([key, className]) => {
    // Process theme tokens in className
    const processedClassName = className
      .replace(/theme-primary/g, theme.colors.primary)
      .replace(/theme-bg/g, theme.colors.background)
      .replace(/theme-text/g, theme.colors.text);
    
    compiledStyles[key as keyof T] = processedClassName;
  });
  
  return compiledStyles;
}

// Usage
const useStyles = () => {
  const { theme } = useTheme();
  
  return createStyleSheet({
    container: 'flex-1 bg-theme-bg',
    title: 'text-2xl font-bold text-theme-text',
    button: 'bg-theme-primary px-6 py-3 rounded-lg',
  }, theme);
};

// Conditional styling helper
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Usage
<View className={cn(
  'p-4 rounded-lg',
  isActive && 'bg-blue-100',
  isDisabled && 'opacity-50',
  size === 'large' && 'p-6'
)}>
```

### Animation-Ready Styling
```typescript
// Animated component with NativeWind
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from 'react-native-reanimated';

export function AnimatedCard({ 
  children, 
  isPressed = false 
}: { 
  children: React.ReactNode;
  isPressed?: boolean;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  React.useEffect(() => {
    scale.value = withSpring(isPressed ? 0.95 : 1);
    opacity.value = withTiming(isPressed ? 0.8 : 1, { duration: 150 });
  }, [isPressed]);

  return (
    <Animated.View 
      style={animatedStyle}
      className="bg-white rounded-xl shadow-md p-4"
    >
      {children}
    </Animated.View>
  );
}

// Gesture-based styling
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight 
}: {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  const translateX = useSharedValue(0);
  const backgroundColor = useSharedValue('rgb(255, 255, 255)');

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      
      if (event.translationX > 50) {
        backgroundColor.value = 'rgb(34, 197, 94)'; // Green
      } else if (event.translationX < -50) {
        backgroundColor.value = 'rgb(239, 68, 68)'; // Red
      } else {
        backgroundColor.value = 'rgb(255, 255, 255)'; // White
      }
    })
    .onEnd((event) => {
      if (event.translationX > 100) {
        onSwipeRight?.();
      } else if (event.translationX < -100) {
        onSwipeLeft?.();
      }
      
      translateX.value = withSpring(0);
      backgroundColor.value = withTiming('rgb(255, 255, 255)');
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    backgroundColor: backgroundColor.value,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View 
        style={animatedStyle}
        className="rounded-xl shadow-md p-4 mx-4 my-2"
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
```

### Platform-Specific Optimizations
```typescript
// Platform-specific components
export function PlatformView({ 
  children, 
  className = "",
  iosClassName = "",
  androidClassName = "",
  webClassName = ""
}: {
  children: React.ReactNode;
  className?: string;
  iosClassName?: string;
  androidClassName?: string;
  webClassName?: string;
}) {
  const platformClass = Platform.select({
    ios: iosClassName,
    android: androidClassName,
    web: webClassName,
    default: '',
  });

  return (
    <View className={cn(className, platformClass)}>
      {children}
    </View>
  );
}

// Usage
<PlatformView
  className="p-4 rounded-lg"
  iosClassName="bg-gray-50 shadow-sm"
  androidClassName="bg-white elevation-2"
  webClassName="bg-white shadow-lg border border-gray-200"
>
  <Text>Platform-optimized content</Text>
</PlatformView>

// Safe area handling with NativeWind
export function SafeContainer({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      className={cn('flex-1', className)}
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {children}
    </View>
  );
}
```

### Performance-Optimized Styling
```typescript
// Memoized style calculations
const useMemoizedStyles = (theme: Theme, props: any) => {
  return useMemo(() => ({
    container: cn(
      'flex-1 p-4',
      props.variant === 'primary' && 'bg-blue-50',
      props.variant === 'secondary' && 'bg-gray-50',
    ),
    text: cn(
      'text-base',
      theme.isDark ? 'text-white' : 'text-gray-900',
      props.size === 'large' && 'text-lg',
    ),
  }), [theme, props.variant, props.size]);
};

// Style caching for complex components
const styleCache = new Map<string, string>();

export function getCachedStyle(key: string, generator: () => string): string {
  if (styleCache.has(key)) {
    return styleCache.get(key)!;
  }
  
  const style = generator();
  styleCache.set(key, style);
  return style;
}

// Virtual list optimizations
export function VirtualizedList({ 
  data, 
  renderItem,
  estimatedItemSize = 100 
}: {
  data: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  estimatedItemSize?: number;
}) {
  const { height } = useWindowDimensions();
  const [scrollY, setScrollY] = useState(0);
  
  const visibleStart = Math.floor(scrollY / estimatedItemSize);
  const visibleCount = Math.ceil(height / estimatedItemSize) + 2;
  const visibleEnd = Math.min(visibleStart + visibleCount, data.length);
  
  const visibleItems = data.slice(visibleStart, visibleEnd);
  
  return (
    <ScrollView
      className="flex-1"
      onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}
    >
      <View style={{ height: visibleStart * estimatedItemSize }} />
      {visibleItems.map((item, index) => (
        <View key={visibleStart + index}>
          {renderItem(item, visibleStart + index)}
        </View>
      ))}
      <View style={{ height: (data.length - visibleEnd) * estimatedItemSize }} />
    </ScrollView>
  );
}
```

### Advanced Color Systems
```typescript
// Color palette generator
export function generateColorPalette(baseColor: string) {
  // Using color manipulation library like chroma-js or tinycolor2
  const base = new TinyColor(baseColor);
  
  return {
    50: base.lighten(40).toString(),
    100: base.lighten(30).toString(),
    200: base.lighten(20).toString(),
    300: base.lighten(10).toString(),
    400: base.lighten(5).toString(),
    500: base.toString(),
    600: base.darken(5).toString(),
    700: base.darken(10).toString(),
    800: base.darken(20).toString(),
    900: base.darken(30).toString(),
  };
}

// Accessibility color contrast checker
export function getContrastColor(backgroundColor: string): string {
  const color = new TinyColor(backgroundColor);
  const luminance = color.getLuminance();
  
  // Return white text for dark backgrounds, dark text for light backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Dynamic brand color system
export function useBrandColors(primaryColor: string) {
  return useMemo(() => {
    const palette = generateColorPalette(primaryColor);
    
    return {
      primary: palette,
      secondary: generateColorPalette(
        new TinyColor(primaryColor).complement().toString()
      ),
      neutral: generateColorPalette('#6B7280'),
      success: generateColorPalette('#10B981'),
      warning: generateColorPalette('#F59E0B'),
      error: generateColorPalette('#EF4444'),
    };
  }, [primaryColor]);
}
```

This advanced styling guide provides sophisticated patterns for creating scalable, performant, and maintainable styling systems in Expo Router applications.