# Expo Components Advanced Guidelines

## Complex Component Patterns

### Compound Components Pattern
```typescript
// Multi-part component system
interface AccordionContextType {
  openItems: Set<string>;
  toggleItem: (id: string) => void;
  allowMultiple: boolean;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

function AccordionRoot({
  children,
  allowMultiple = false,
  className = ""
}: {
  children: React.ReactNode;
  allowMultiple?: boolean;
  className?: string;
}) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(id);
      }
      return newSet;
    });
  }, [allowMultiple]);

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, allowMultiple }}>
      <View className={cn('border border-gray-200 rounded-lg overflow-hidden', className)}>
        {children}
      </View>
    </AccordionContext.Provider>
  );
}

function AccordionItem({
  id,
  children,
  className = ""
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('AccordionItem must be used within AccordionRoot');

  const isOpen = context.openItems.has(id);

  return (
    <View className={cn('border-b border-gray-200 last:border-b-0', className)}>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, { id, isOpen })
          : child
      )}
    </View>
  );
}

function AccordionTrigger({
  id,
  isOpen,
  children,
  className = ""
}: {
  id: string;
  isOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('AccordionTrigger must be used within AccordionRoot');

  return (
    <TouchableOpacity
      onPress={() => context.toggleItem(id)}
      className={cn(
        'flex-row items-center justify-between p-4 bg-white active:bg-gray-50',
        className
      )}
    >
      <View className="flex-1">
        {children}
      </View>
      <View className={cn(
        'transition-transform duration-200',
        isOpen ? 'rotate-180' : 'rotate-0'
      )}>
        <ChevronDownIcon size={20} color="#6B7280" />
      </View>
    </TouchableOpacity>
  );
}

function AccordionContent({
  id,
  isOpen,
  children,
  className = ""
}: {
  id: string;
  isOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [height, setHeight] = useState(0);
  const animatedHeight = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedHeight.value === 0 ? 0 : 1,
  }));

  useEffect(() => {
    animatedHeight.value = withTiming(isOpen ? height : 0, { duration: 200 });
  }, [isOpen, height]);

  return (
    <Animated.View style={animatedStyle} className="overflow-hidden">
      <View
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
        className={cn('p-4 bg-gray-50', className)}
      >
        {children}
      </View>
    </Animated.View>
  );
}

// Export as compound component
export const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
};

// Usage
<Accordion.Root allowMultiple>
  <Accordion.Item id="item1">
    <Accordion.Trigger>
      <Text className="font-medium">What is Expo?</Text>
    </Accordion.Trigger>
    <Accordion.Content>
      <Text>Expo is a platform for building React Native apps...</Text>
    </Accordion.Content>
  </Accordion.Item>
</Accordion.Root>
```

### Render Props Pattern
```typescript
// Data fetcher with render props
interface DataFetcherProps<T> {
  url: string;
  children: (state: {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
  }) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return <>{children({ data, loading, error, refetch: fetchData })}</>;
}

// Usage
<DataFetcher<User[]> url="/api/users">
  {({ data, loading, error, refetch }) => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error} onRetry={refetch} />;
    return (
      <FlatList
        data={data}
        renderItem={({ item }) => <UserCard user={item} />}
        keyExtractor={item => item.id}
      />
    );
  }}
</DataFetcher>
```

### Advanced Form Components
```typescript
// Form builder with validation
interface FormField {
  name: string;
  type: 'text' | 'email' | 'password' | 'select' | 'checkbox';
  label: string;
  placeholder?: string;
  required?: boolean;
  validation?: (value: any) => string | null;
  options?: Array<{ label: string; value: string }>;
}

interface FormBuilderProps {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => void;
  initialValues?: Record<string, any>;
  className?: string;
}

export function FormBuilder({
  fields,
  onSubmit,
  initialValues = {},
  className = ""
}: FormBuilderProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }

    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    return field.validation ? field.validation(value) : null;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));

    const field = fields.find(f => f.name === fieldName);
    if (field) {
      const error = validateField(field, values[fieldName]);
      setErrors(prev => ({ ...prev, [fieldName]: error || '' }));
    }
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    fields.forEach(field => {
      newTouched[field.name] = true;
      const error = validateField(field, values[field.name]);
      if (error) newErrors[field.name] = error;
    });

    setTouched(newTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSubmit(values);
    }
  };

  const renderField = (field: FormField) => {
    const error = touched[field.name] ? errors[field.name] : '';

    switch (field.type) {
      case 'select':
        return (
          <Select
            key={field.name}
            label={field.label}
            options={field.options || []}
            value={values[field.name]}
            onSelect={(value) => handleFieldChange(field.name, value)}
            error={error}
          />
        );

      case 'checkbox':
        return (
          <Switch
            key={field.name}
            label={field.label}
            value={values[field.name] || false}
            onValueChange={(value) => handleFieldChange(field.name, value)}
          />
        );

      default:
        return (
          <Input
            key={field.name}
            label={field.label}
            placeholder={field.placeholder}
            type={field.type}
            value={values[field.name] || ''}
            onChangeText={(value) => handleFieldChange(field.name, value)}
            onBlur={() => handleFieldBlur(field.name)}
            error={error}
            required={field.required}
          />
        );
    }
  };

  return (
    <View className={cn('p-4', className)}>
      {fields.map(renderField)}

      <Button
        title="Submit"
        onPress={handleSubmit}
        variant="primary"
        fullWidth
        className="mt-6"
      />
    </View>
  );
}

// Usage
const userFormFields: FormField[] = [
  {
    name: 'name',
    type: 'text',
    label: 'Full Name',
    placeholder: 'Enter your full name',
    required: true,
  },
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email',
    required: true,
  },
  {
    name: 'role',
    type: 'select',
    label: 'Role',
    required: true,
    options: [
      { label: 'Admin', value: 'admin' },
      { label: 'User', value: 'user' },
      { label: 'Guest', value: 'guest' },
    ],
  },
];

<FormBuilder
  fields={userFormFields}
  onSubmit={(data) => console.log('Form submitted:', data)}
  initialValues={{ name: 'John Doe' }}
/>
```

### Advanced List Components
```typescript
// Virtualized list with search and filters
interface VirtualListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  searchable?: boolean;
  searchFields?: (keyof T)[];
  filters?: Array<{
    key: keyof T;
    label: string;
    options: Array<{ label: string; value: any }>;
  }>;
  sortOptions?: Array<{
    key: keyof T;
    label: string;
    direction: 'asc' | 'desc';
  }>;
  estimatedItemSize?: number;
  className?: string;
}

export function VirtualList<T>({
  data,
  renderItem,
  keyExtractor,
  searchable = false,
  searchFields = [],
  filters = [],
  sortOptions = [],
  estimatedItemSize = 100,
  className = ""
}: VirtualListProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchQuery && searchFields.length > 0) {
      result = result.filter(item =>
        searchFields.some(field =>
          String(item[field]).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        result = result.filter(item => item[key as keyof T] === value);
      }
    });

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        const aVal = a[sortBy as keyof T];
        const bVal = b[sortBy as keyof T];

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, searchFields, activeFilters, sortBy, sortDirection]);

  const { height } = useWindowDimensions();
  const [scrollY, setScrollY] = useState(0);

  const visibleStart = Math.floor(scrollY / estimatedItemSize);
  const visibleCount = Math.ceil(height / estimatedItemSize) + 2;
  const visibleEnd = Math.min(visibleStart + visibleCount, filteredData.length);

  const visibleItems = filteredData.slice(visibleStart, visibleEnd);

  return (
    <View className={cn('flex-1', className)}>
      {/* Search and filters header */}
      {(searchable || filters.length > 0 || sortOptions.length > 0) && (
        <View className="p-4 bg-white border-b border-gray-200">
          {searchable && (
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon={<SearchIcon size={20} color="#6B7280" />}
              className="mb-4"
            />
          )}

          <View className="flex-row flex-wrap -mx-1">
            {filters.map(filter => (
              <View key={String(filter.key)} className="px-1 mb-2">
                <Select
                  placeholder={filter.label}
                  options={[
                    { label: 'All', value: '' },
                    ...filter.options
                  ]}
                  value={activeFilters[String(filter.key)] || ''}
                  onSelect={(value) =>
                    setActiveFilters(prev => ({
                      ...prev,
                      [String(filter.key)]: value
                    }))
                  }
                />
              </View>
            ))}

            {sortOptions.length > 0 && (
              <View className="px-1 mb-2">
                <Select
                  placeholder="Sort by"
                  options={[
                    { label: 'Default', value: '' },
                    ...sortOptions.map(option => ({
                      label: `${option.label} (${option.direction})`,
                      value: `${String(option.key)}:${option.direction}`
                    }))
                  ]}
                  value={sortBy ? `${sortBy}:${sortDirection}` : ''}
                  onSelect={(value) => {
                    if (!value) {
                      setSortBy('');
                      return;
                    }
                    const [key, direction] = value.split(':');
                    setSortBy(key);
                    setSortDirection(direction as 'asc' | 'desc');
                  }}
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Virtual list */}
      <ScrollView
        className="flex-1"
        onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {/* Spacer for items before visible area */}
        <View style={{ height: visibleStart * estimatedItemSize }} />

        {/* Visible items */}
        {visibleItems.map((item, index) => (
          <View key={keyExtractor(item)}>
            {renderItem(item, visibleStart + index)}
          </View>
        ))}

        {/* Spacer for items after visible area */}
        <View style={{
          height: (filteredData.length - visibleEnd) * estimatedItemSize
        }} />
      </ScrollView>

      {/* Results counter */}
      <View className="p-2 bg-gray-50 border-t border-gray-200">
        <Text className="text-sm text-gray-600 text-center">
          Showing {filteredData.length} of {data.length} items
        </Text>
      </View>
    </View>
  );
}
```

### Performance-Optimized Components
```typescript
// Memoized complex component
interface ComplexCardProps {
  user: User;
  stats: UserStats;
  onAction: (action: string, userId: string) => void;
  isSelected: boolean;
}

export const ComplexCard = React.memo<ComplexCardProps>(({
  user,
  stats,
  onAction,
  isSelected
}) => {
  // Memoize expensive calculations
  const computedData = useMemo(() => ({
    fullName: `${user.firstName} ${user.lastName}`,
    completionRate: (stats.completed / stats.total) * 100,
    badge: stats.score > 90 ? 'gold' : stats.score > 70 ? 'silver' : 'bronze'
  }), [user.firstName, user.lastName, stats.completed, stats.total, stats.score]);

  // Memoize callbacks to prevent child re-renders
  const handleEdit = useCallback(() => {
    onAction('edit', user.id);
  }, [onAction, user.id]);

  const handleDelete = useCallback(() => {
    onAction('delete', user.id);
  }, [onAction, user.id]);

  return (
    <View className={cn(
      'p-4 bg-white rounded-lg shadow-sm border',
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    )}>
      <View className="flex-row items-center mb-3">
        <Image
          source={{ uri: user.avatar }}
          className="w-12 h-12 rounded-full mr-3"
        />
        <View className="flex-1">
          <Text className="text-lg font-semibold">{computedData.fullName}</Text>
          <Text className="text-gray-600">{user.email}</Text>
        </View>
        <View className={cn(
          'px-2 py-1 rounded-full',
          computedData.badge === 'gold' ? 'bg-yellow-100' :
          computedData.badge === 'silver' ? 'bg-gray-100' : 'bg-orange-100'
        )}>
          <Text className="text-xs font-medium">
            {computedData.badge.toUpperCase()}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-sm text-gray-600">
          Completion: {computedData.completionRate.toFixed(1)}%
        </Text>
        <Text className="text-sm text-gray-600">
          Score: {stats.score}
        </Text>
      </View>

      <View className="flex-row space-x-2">
        <Button
          title="Edit"
          variant="outline"
          size="sm"
          onPress={handleEdit}
          className="flex-1"
        />
        <Button
          title="Delete"
          variant="danger"
          size="sm"
          onPress={handleDelete}
          className="flex-1"
        />
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.user.id === nextProps.user.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.stats.score === nextProps.stats.score &&
    prevProps.stats.completed === nextProps.stats.completed &&
    prevProps.stats.total === nextProps.stats.total
  );
});

ComplexCard.displayName = 'ComplexCard';
```

### Error Boundary Components
```typescript
// Generic error boundary with retry functionality
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    resetError: () => void;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-xl font-bold text-red-600 mb-2">
            Something went wrong
          </Text>
          <Text className="text-gray-600 text-center mb-4">
            {this.state.error.message}
          </Text>
          <Button
            title="Try Again"
            onPress={this.resetError}
            variant="primary"
          />
        </View>
      );
    }

    return this.props.children;
  }
}

// Custom error fallback component
function CustomErrorFallback({
  error,
  resetError
}: {
  error: Error;
  resetError: () => void;
}) {
  return (
    <View className="flex-1 justify-center items-center p-4 bg-red-50">
      <Text className="text-6xl mb-4">😵</Text>
      <Text className="text-xl font-bold text-red-600 mb-2">
        Oops! Something broke
      </Text>
      <Text className="text-gray-700 text-center mb-4">
        {error.message}
      </Text>
      <Button
        title="Reset App"
        onPress={resetError}
        variant="danger"
      />
    </View>
  );
}

// Usage
<ErrorBoundary
  fallback={CustomErrorFallback}
  onError={(error, errorInfo) => {
    // Log to crash reporting service
    console.error('Component error:', error, errorInfo);
  }}
>
  <MyApp />
</ErrorBoundary>
```

This comprehensive components guide provides advanced patterns for building scalable, performant, and maintainable component systems in Expo Router applications.
