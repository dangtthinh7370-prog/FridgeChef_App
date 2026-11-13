// src/navigation/RootNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import TabNavigator from './TabNavigator';
import AddFoodScreen from '../screens/fridge/AddFoodScreen';
import FoodDetailScreen from '../screens/fridge/FoodDetailScreen';
import BarcodeScreen from '../screens/fridge/BarcodeScreen';
import ExpiryAlertScreen from '../screens/home/ExpiryAlertScreen';
import AIChefScreen from '../screens/recipe/AIChefScreen';
import RecipeDetailScreen from '../screens/recipe/RecipeDetailScreen';
import CookingModeScreen from '../screens/recipe/CookingModeScreen';
import { useAuth } from '../viewmodels/AuthProvider';
import { FridgeProvider } from '../viewmodels/FridgeProvider';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user } = useAuth();
  if (!user) return <LoginScreen />;
  return <FridgeProvider key={user.id}><AuthenticatedNavigator /></FridgeProvider>;
}

function AuthenticatedNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Màn hình Đăng nhập (01) */}

        {/* 4 Tabs Chính: Trang chủ, Tủ lạnh, Đi chợ, Tài khoản */}
        <Stack.Screen name="MainTabs" component={TabNavigator} />

        {/* Các màn hình tính năng con (Sub-screens) */}
        <Stack.Screen name="AddFood" component={AddFoodScreen} />
        <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
        <Stack.Screen name="BarcodeScanner" component={BarcodeScreen} />
        <Stack.Screen name="ExpiryAlert" component={ExpiryAlertScreen} />
        <Stack.Screen name="AIChef" component={AIChefScreen} />
        <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
        <Stack.Screen name="CookingMode" component={CookingModeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
