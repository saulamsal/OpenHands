---
name: expo-components
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- components
- ui
- forms
- inputs
- buttons
- modal
- list
- card
- header
- navigation
---

# Expo Universal Components Library

You are an expert in building **reusable, universal UI components** for Expo Router applications that work seamlessly on iOS, Android, and Web using NativeWind styling.

## 🧩 Core Component Principles

### Universal First
Every component MUST work on iOS, Android, AND Web without modifications.

### NativeWind Styled
All components use NativeWind classes - NEVER StyleSheet.create.

### TypeScript Ready
All components are fully typed with proper interfaces.

### Accessibility Built-in
Components include proper accessibility attributes by default.

## 🔘 Button Components

### Base Button Component
```tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  className = '',
}: ButtonProps) {
  const baseClasses = `
    rounded-lg font-semibold text-center items-center justify-center
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50' : 'active:opacity-80'}
  `;

  const variantClasses = {
    primary: 'bg-blue-500 web:hover:bg-blue-600',
    secondary: 'bg-gray-100 web:hover:bg-gray-200',
    outline: 'border-2 border-blue-500 bg-transparent web:hover:bg-blue-50',
    ghost: 'bg-transparent web:hover:bg-gray-100',
    danger: 'bg-red-500 web:hover:bg-red-600',
  };

  const textVariantClasses = {
    primary: 'text-white',
    secondary: 'text-gray-900',
    outline: 'text-blue-500',
    ghost: 'text-gray-700',
    danger: 'text-white',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  return (
    <TouchableOpacity
      onPress={disabled || loading ? undefined : onPress}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View className="flex-row items-center">
        {loading && (
          <ActivityIndicator
            size="small"
            color={textVariantClasses[variant].includes('white') ? 'white' : '#374151'}
            className="mr-2"
          />
        )}
        {!loading && icon && <View className="mr-2">{icon}</View>}
        <Text className={`font-semibold ${textVariantClasses[variant]}`}>
          {loading ? 'Loading...' : title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Usage Examples
<Button title="Primary Button" variant="primary" onPress={() => {}} />
<Button title="Loading" variant="primary" loading={true} />
<Button title="With Icon" variant="outline" icon={<Icon name="heart" />} />
<Button title="Full Width" variant="secondary" fullWidth={true} />
```

### Icon Button
```tsx
interface IconButtonProps {
  icon: React.ReactNode;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  accessibilityLabel: string;
  className?: string;
}

export function IconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'ghost',
  accessibilityLabel,
  className = '',
}: IconButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const variantClasses = {
    primary: 'bg-blue-500 web:hover:bg-blue-600',
    secondary: 'bg-gray-100 web:hover:bg-gray-200',
    ghost: 'bg-transparent web:hover:bg-gray-100',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`
        ${sizeClasses[size]} rounded-lg items-center justify-center
        ${variantClasses[variant]} active:opacity-70 ${className}
      `}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {icon}
    </TouchableOpacity>
  );
}
```

## 📝 Form Components

### Input Field
```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  helperText,
  type = 'text',
  required = false,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  leftIcon,
  rightIcon,
  className = '',
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const getKeyboardType = () => {
    switch (type) {
      case 'email': return 'email-address';
      case 'number': return 'numeric';
      default: return 'default';
    }
  };

  return (
    <View className={`mb-4 ${className}`}>
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-2">
          {label} {required && <Text className="text-red-500">*</Text>}
        </Text>
      )}
      
      <View className={`
        flex-row items-center border rounded-lg px-3
        ${multiline ? 'py-3' : 'py-3'}
        ${error 
          ? 'border-red-500 bg-red-50' 
          : 'border-gray-300 bg-white focus:border-blue-500'
        }
        ${disabled ? 'bg-gray-100 opacity-60' : ''}
      `}>
        {leftIcon && (
          <View className="mr-3">
            {leftIcon}
          </View>
        )}
        
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={getKeyboardType()}
          secureTextEntry={type === 'password' && !showPassword}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          className={`
            flex-1 text-base text-gray-900
            ${multiline ? 'text-top' : ''}
            web:outline-none
          `}
          placeholderTextColor="#9CA3AF"
        />
        
        {type === 'password' && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="ml-3"
          >
            <Text className="text-blue-500 text-sm">
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        )}
        
        {rightIcon && (
          <View className="ml-3">
            {rightIcon}
          </View>
        )}
      </View>
      
      {error && (
        <Text className="text-sm text-red-600 mt-1">
          {error}
        </Text>
      )}
      
      {helperText && !error && (
        <Text className="text-sm text-gray-500 mt-1">
          {helperText}
        </Text>
      )}
    </View>
  );
}
```

### Form Container
```tsx
interface FormProps {
  children: React.ReactNode;
  onSubmit?: () => void;
  className?: string;
}

export function Form({ children, onSubmit, className = '' }: FormProps) {
  return (
    <View className={`p-4 ${className}`}>
      {children}
    </View>
  );
}

// Usage
<Form onSubmit={handleSubmit}>
  <Input
    label="Email"
    type="email"
    value={email}
    onChangeText={setEmail}
    required
  />
  <Input
    label="Password"
    type="password"
    value={password}
    onChangeText={setPassword}
    required
  />
  <Button title="Sign In" variant="primary" fullWidth onPress={handleSubmit} />
</Form>
```

### Select/Picker Component
```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onSelect: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  label,
  placeholder = 'Select an option',
  options,
  value,
  onSelect,
  error,
  disabled = false,
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(option => option.value === value);

  return (
    <View className={`mb-4 ${className}`}>
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-2">
          {label}
        </Text>
      )}
      
      <TouchableOpacity
        onPress={disabled ? undefined : () => setIsOpen(true)}
        className={`
          border rounded-lg px-3 py-3 flex-row justify-between items-center
          ${error 
            ? 'border-red-500 bg-red-50' 
            : 'border-gray-300 bg-white'
          }
          ${disabled ? 'bg-gray-100 opacity-60' : ''}
        `}
        disabled={disabled}
      >
        <Text className={`text-base ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text className="text-gray-400">▼</Text>
      </TouchableOpacity>
      
      {error && (
        <Text className="text-sm text-red-600 mt-1">
          {error}
        </Text>
      )}

      <Modal visible={isOpen} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setIsOpen(false)}
        >
          <View className="bg-white rounded-lg w-4/5 max-h-96">
            <View className="p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-center">
                {label || 'Select Option'}
              </Text>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item.value);
                    setIsOpen(false);
                  }}
                  className="p-4 border-b border-gray-100"
                >
                  <Text className={`text-base ${item.value === value ? 'text-blue-500 font-medium' : 'text-gray-900'}`}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
```

## 🃏 Card Components

### Base Card
```tsx
interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  shadow?: boolean;
}

export function Card({ children, onPress, className = '', shadow = true }: CardProps) {
  const Component = onPress ? TouchableOpacity : View;
  
  return (
    <Component
      onPress={onPress}
      className={`
        bg-white rounded-xl border border-gray-100 p-4
        ${shadow ? 'web:shadow-lg shadow-sm' : ''}
        ${onPress ? 'active:opacity-80 web:hover:shadow-xl web:transition-shadow' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}
```

### Feature Card
```tsx
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress?: () => void;
  className?: string;
}

export function FeatureCard({ icon, title, description, onPress, className = '' }: FeatureCardProps) {
  return (
    <Card onPress={onPress} className={className}>
      <View className="items-center text-center">
        <View className="mb-4 p-3 bg-blue-50 rounded-full">
          {icon}
        </View>
        <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
          {title}
        </Text>
        <Text className="text-gray-600 text-center leading-relaxed">
          {description}
        </Text>
      </View>
    </Card>
  );
}
```

## 📋 List Components

### List Item
```tsx
interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onPress,
  disabled = false,
  className = '',
}: ListItemProps) {
  const Component = onPress ? TouchableOpacity : View;
  
  return (
    <Component
      onPress={disabled ? undefined : onPress}
      className={`
        flex-row items-center py-4 px-4 border-b border-gray-100
        ${onPress && !disabled ? 'active:bg-gray-50' : ''}
        ${disabled ? 'opacity-50' : ''}
        ${className}
      `}
      disabled={disabled}
    >
      {leftIcon && (
        <View className="mr-4">
          {leftIcon}
        </View>
      )}
      
      <View className="flex-1">
        <Text className="text-base font-medium text-gray-900">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-sm text-gray-500 mt-1">
            {subtitle}
          </Text>
        )}
      </View>
      
      {rightIcon && (
        <View className="ml-4">
          {rightIcon}
        </View>
      )}
    </Component>
  );
}
```

### Section List
```tsx
interface SectionData {
  title: string;
  data: any[];
}

interface SectionListProps {
  sections: SectionData[];
  renderItem: ({ item, index }: { item: any; index: number }) => React.ReactElement;
  keyExtractor: (item: any, index: number) => string;
  className?: string;
}

export function SectionList({ sections, renderItem, keyExtractor, className = '' }: SectionListProps) {
  return (
    <View className={className}>
      {sections.map((section, sectionIndex) => (
        <View key={sectionIndex} className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3 px-4">
            {section.title}
          </Text>
          <View className="bg-white rounded-lg border border-gray-100">
            {section.data.map((item, itemIndex) => (
              <View key={keyExtractor(item, itemIndex)}>
                {renderItem({ item, index: itemIndex })}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
```

## 🏠 Header Components

### App Header
```tsx
interface HeaderProps {
  title: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  subtitle?: string;
  className?: string;
}

export function Header({
  title,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  subtitle,
  className = '',
}: HeaderProps) {
  return (
    <View className={`
      flex-row items-center justify-between p-4 bg-white border-b border-gray-200
      ${className}
    `}>
      <View className="flex-row items-center flex-1">
        {leftIcon && (
          <TouchableOpacity onPress={onLeftPress} className="mr-4">
            {leftIcon}
          </TouchableOpacity>
        )}
        
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">
            {title}
          </Text>
          {subtitle && (
            <Text className="text-sm text-gray-500">
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      {rightIcon && (
        <TouchableOpacity onPress={onRightPress} className="ml-4">
          {rightIcon}
        </TouchableOpacity>
      )}
    </View>
  );
}
```

## 🔔 Modal Components

### Base Modal
```tsx
interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  closable?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  size = 'md',
  closable = true,
}: ModalProps) {
  const sizeClasses = {
    sm: 'w-4/5 max-w-sm',
    md: 'w-4/5 max-w-md',
    lg: 'w-4/5 max-w-lg',
    full: 'w-full h-full',
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className={`
          bg-white rounded-lg ${size === 'full' ? '' : sizeClasses[size]}
          max-h-4/5
        `}>
          {title && (
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-900">
                {title}
              </Text>
              {closable && (
                <TouchableOpacity onPress={onClose}>
                  <Text className="text-gray-400 text-2xl">×</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          <View className={`${title ? 'p-4' : 'p-6'}`}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

### Alert Modal
```tsx
interface AlertProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

export function Alert({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  type = 'info',
}: AlertProps) {
  const iconColors = {
    info: 'text-blue-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    success: 'text-green-500',
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-white rounded-lg w-4/5 max-w-sm">
          <View className="p-6 items-center">
            <View className={`mb-4 ${iconColors[type]}`}>
              {/* Add your icon component here */}
              <Text className="text-4xl">ℹ️</Text>
            </View>
            
            <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
              {title}
            </Text>
            
            <Text className="text-gray-600 text-center leading-relaxed mb-6">
              {message}
            </Text>
            
            <View className="flex-row space-x-3 w-full">
              {onCancel && (
                <Button
                  title={cancelText}
                  onPress={onCancel}
                  variant="outline"
                  className="flex-1"
                />
              )}
              
              <Button
                title={confirmText}
                onPress={onConfirm || onCancel}
                variant="primary"
                className="flex-1"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

## 🎛️ Toggle Components

### Switch
```tsx
interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ value, onValueChange, label, disabled = false, className = '' }: SwitchProps) {
  return (
    <View className={`flex-row items-center justify-between ${className}`}>
      {label && (
        <Text className="text-base text-gray-900 flex-1 mr-4">
          {label}
        </Text>
      )}
      
      <TouchableOpacity
        onPress={disabled ? undefined : () => onValueChange(!value)}
        className={`
          w-12 h-6 rounded-full p-1 justify-center
          ${value ? 'bg-blue-500' : 'bg-gray-300'}
          ${disabled ? 'opacity-50' : ''}
        `}
        disabled={disabled}
      >
        <View className={`
          w-4 h-4 rounded-full bg-white transition-transform
          ${value ? 'translate-x-6' : 'translate-x-0'}
        `} />
      </TouchableOpacity>
    </View>
  );
}
```

## 💫 Loading Components

### Loading Spinner
```tsx
interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'small', color = '#3B82F6', className = '' }: LoadingSpinnerProps) {
  return (
    <View className={`items-center justify-center ${className}`}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}
```

### Skeleton Loader
```tsx
interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

export function Skeleton({ width = '100%', height = 20, className = '' }: SkeletonProps) {
  return (
    <View
      className={`bg-gray-200 rounded animate-pulse ${className}`}
      style={{ width, height }}
    />
  );
}

// Usage for complex loading states
export function SkeletonCard() {
  return (
    <Card>
      <Skeleton height={120} className="mb-4" />
      <Skeleton height={20} width="80%" className="mb-2" />
      <Skeleton height={16} width="60%" />
    </Card>
  );
}
```

## 🎯 Best Practices

### Component Composition
```tsx
// Compose complex components from simpler ones
export function UserProfileCard({ user, onEdit, onMessage }: UserProfileCardProps) {
  return (
    <Card>
      <View className="flex-row items-center mb-4">
        <Image source={{ uri: user.avatar }} className="w-12 h-12 rounded-full mr-4" />
        <View className="flex-1">
          <Text className="text-lg font-semibold">{user.name}</Text>
          <Text className="text-gray-500">{user.email}</Text>
        </View>
      </View>
      
      <View className="flex-row space-x-3">
        <Button title="Edit" variant="outline" onPress={onEdit} className="flex-1" />
        <Button title="Message" variant="primary" onPress={onMessage} className="flex-1" />
      </View>
    </Card>
  );
}
```

### Error Boundaries
```tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  // Implement error boundary logic
  return (
    <View className="flex-1">
      {children}
    </View>
  );
}
```

## 🚨 Component Guidelines

### ✅ Do:
- Use TypeScript interfaces for all props
- Include accessibility properties
- Test on all platforms (iOS, Android, Web)
- Use semantic component names
- Implement proper error states
- Include loading states for async operations

### ❌ Don't:
- Use StyleSheet.create - always use NativeWind
- Forget platform-specific considerations
- Ignore accessibility requirements
- Create overly complex components
- Skip prop validation
- Hardcode colors or sizes

This component library provides a solid foundation for building consistent, accessible, and beautiful Expo Router applications across all platforms.