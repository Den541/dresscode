import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import RecommendationScreen from './src/screens/RecommendationScreen';

export type RootStackParamList = {
  Home: undefined;
  Recommendation: { weather: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#0b0b0b' },
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#0b0b0b' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Recommendation" component={RecommendationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}