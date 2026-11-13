// App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { FridgeProvider } from './src/viewmodels/FridgeProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <FridgeProvider>
        <RootNavigator />
      </FridgeProvider>
    </SafeAreaProvider>
  );
}
