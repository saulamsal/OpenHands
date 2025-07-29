import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';

export default function ModalScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center p-6">
        <Text className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Hi from modal!
        </Text>
        
        <TouchableOpacity 
          onPress={() => router.back()}
          className="bg-red-500 px-8 py-4 rounded-xl active:bg-red-600 web:hover:bg-red-600"
        >
          <Text className="text-white font-semibold text-center text-lg">
            Close it
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}