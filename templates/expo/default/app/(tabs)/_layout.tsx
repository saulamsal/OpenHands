import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

// Simple tab bar icons using text
function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  const iconMap = {
    home: '🏠',
  };

  return (
    <View className="items-center justify-center">
      <Text className={`text-lg ${focused ? 'text-blue-500' : 'text-gray-400'}`}>
        {iconMap[name as keyof typeof iconMap] || '•'}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTintColor: '#000000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabBarIcon name="home" focused={focused} />,
        }}
      />
    </Tabs>
  );
}