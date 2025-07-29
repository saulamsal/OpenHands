import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function HomeTab() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center p-6">
        <Text className="text-3xl font-bold text-gray-900 mb-4 text-center">
          Hi, Let's build something amazing!
        </Text>
        
        <TouchableOpacity 
          onPress={() => router.push('/modal')}
          className="bg-blue-500 px-8 py-4 rounded-xl active:bg-blue-600 web:hover:bg-blue-600"
        >
          <Text className="text-white font-semibold text-center text-lg">
            Open Modal
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}