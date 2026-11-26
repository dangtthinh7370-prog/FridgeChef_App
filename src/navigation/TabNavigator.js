// src/navigation/TabNavigator.js
import React from 'react';
import { Text, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/home/HomeScreen';
import FridgeScreen from '../screens/fridge/FridgeScreen';
import ShoppingListScreen from '../screens/shopping/ShoppingListScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AIChefScreen from '../screens/recipe/AIChefScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360 || fontScale > 1.15;
  const barHeight = compact ? Math.ceil(33 + 28 * fontScale) : 56;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.divider,
          height: barHeight + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarLabelPosition: 'below-icon',
        tabBarLabel: ({ color }) => (
          <Text
            numberOfLines={2}
            style={{
              color,
              fontSize: compact ? 11 : 12,
              fontWeight: '600',
              textAlign: 'center',
              paddingHorizontal: 2,
            }}
          >
            {route.name}
          </Text>
        ),
        tabBarIcon: ({ focused, color }) => {
          let iconName = 'home-outline';
          if (route.name === 'Món ăn') iconName = focused ? 'restaurant' : 'restaurant-outline';
          if (route.name === 'Trang chủ') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Tủ lạnh') {
            iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
          } else if (route.name === 'Đi chợ') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Tài khoản') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Trang chủ" component={HomeScreen} />
      <Tab.Screen name="Tủ lạnh" component={FridgeScreen} />
      <Tab.Screen name="Món ăn" component={AIChefScreen} />
      <Tab.Screen name="Đi chợ" component={ShoppingListScreen} />
      <Tab.Screen name="Tài khoản" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
