import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {PaperProvider} from 'react-native-paper';
import {Provider as ReduxProvider} from 'react-redux';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import {store} from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import {CartProvider} from './src/context/CartContext';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <PaperProvider>
            <NavigationContainer>
              <CartProvider>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <AppNavigator />
              </CartProvider>
            </NavigationContainer>
            <Toast />
          </PaperProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}

export default App;
