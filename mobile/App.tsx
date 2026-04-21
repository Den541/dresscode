import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import RecommendationScreen from './src/screens/RecommendationScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WardrobeScreen from './src/screens/WardrobeScreen';
import AddWardrobeItemScreen from './src/screens/AddWardrobeItemScreen';
import RecommendationHistoryScreen from './src/screens/RecommendationHistoryScreen';
import RecommendationHistoryDetailsScreen from './src/screens/RecommendationHistoryDetailsScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Recommendation: { weather: any };
  RecommendationHistory: undefined;
  RecommendationHistoryDetails: { id: string };
  Profile: undefined;
  Wardrobe: undefined;
  AddWardrobeItem: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0b0b0b' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#0b0b0b' },
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function AppStackNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0D0D0D' },
      }}
    >
      <AppStack.Screen name="Home" component={HomeScreen} />
      <AppStack.Screen name="Recommendation" component={RecommendationScreen} />
      <AppStack.Screen
        name="RecommendationHistory"
        component={RecommendationHistoryScreen}
        options={{ title: 'History' }}
      />
      <AppStack.Screen
        name="RecommendationHistoryDetails"
        component={RecommendationHistoryDetailsScreen}
        options={{ title: 'History Details' }}
      />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="Wardrobe" component={WardrobeScreen} />
      <AppStack.Screen name="AddWardrobeItem" component={AddWardrobeItemScreen} options={{ title: 'Add Item' }} />
    </AppStack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0b0b' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return user ? <AppStackNavigator /> : <AuthStackNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}