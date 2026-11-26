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
import AIChatScreen from '../screens/recipe/AIChatScreen';
import FridgeSuggestionsScreen from '../screens/recipe/FridgeSuggestionsScreen';
import RecipeDetailScreen from '../screens/recipe/RecipeDetailScreen';
import CookingModeScreen from '../screens/recipe/CookingModeScreen';
import { useAuth } from '../viewmodels/AuthProvider';
import { FridgeProvider } from '../viewmodels/FridgeProvider';
import { RecipeProvider } from '../viewmodels/RecipeProvider';
import UseFoodScreen from '../screens/fridge/UseFoodScreen';
import ActivityScreen from '../screens/profile/ActivityScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import { ProfileProvider } from '../viewmodels/ProfileProvider';
import FoodPreferencesScreen from '../screens/profile/FoodPreferencesScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import ChangeEmailScreen from '../screens/profile/ChangeEmailScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, recovery } = useAuth();
  if (user && recovery) return <ResetPasswordScreen />;
  if (!user) return <LoginScreen />;
  return (
    <ProfileProvider key={user.id}>
      <FridgeProvider>
        <RecipeProvider>
          <AuthenticatedNavigator />
        </RecipeProvider>
      </FridgeProvider>
    </ProfileProvider>
  );
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

        <Stack.Screen name="MainTabs" component={TabNavigator} />

        {/* Các màn hình tính năng con (Sub-screens) */}
        <Stack.Screen name="AddFood" component={AddFoodScreen} />
        <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
        <Stack.Screen name="BarcodeScanner" component={BarcodeScreen} />
        <Stack.Screen name="ExpiryAlert" component={ExpiryAlertScreen} />
        <Stack.Screen name="AIChef" component={AIChefScreen} />
        <Stack.Screen name="AIChat" component={AIChatScreen} />
        <Stack.Screen name="FridgeSuggestions" component={FridgeSuggestionsScreen} />
        <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
        <Stack.Screen name="CookingMode" component={CookingModeScreen} />
        <Stack.Screen name="UseFood" component={UseFoodScreen} />
        <Stack.Screen name="Activity" component={ActivityScreen} />
        <Stack.Screen name="FoodPreferences" component={FoodPreferencesScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
