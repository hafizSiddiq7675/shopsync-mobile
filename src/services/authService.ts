import api from '@config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  shop_id: number;
}

export interface Shop {
  id: number;
  name: string;
  points_enabled: boolean;
  store_credit_enabled: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    shop: Shop;
    token: string;
  };
}

export interface AuthState {
  user: AuthUser | null;
  shop: Shop | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Auth Service
export const authService = {
  // Login
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/login', {email, password});

    if (response.data.success) {
      // Store token and user data
      await AsyncStorage.setItem('auth_token', response.data.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.data.user));
      await AsyncStorage.setItem('shop', JSON.stringify(response.data.data.shop));
    }

    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      await api.post('/logout');
    } catch (error) {
      // Ignore API errors during logout
    } finally {
      // Clear storage even if API fails
      await AsyncStorage.multiRemove(['auth_token', 'user', 'shop']);
    }
  },

  // Get current user from API
  getUser: async () => {
    const response = await api.get('/user');
    return response.data;
  },

  // Check if logged in (local check)
  isAuthenticated: async (): Promise<boolean> => {
    const token = await AsyncStorage.getItem('auth_token');
    return !!token;
  },

  // Get stored token
  getToken: async (): Promise<string | null> => {
    return AsyncStorage.getItem('auth_token');
  },

  // Get stored user (no API call)
  getStoredUser: async (): Promise<AuthUser | null> => {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Get stored shop (no API call)
  getStoredShop: async (): Promise<Shop | null> => {
    const shop = await AsyncStorage.getItem('shop');
    return shop ? JSON.parse(shop) : null;
  },

  // Get all stored auth data
  getAuthState: async (): Promise<AuthState> => {
    const [token, userStr, shopStr] = await AsyncStorage.multiGet([
      'auth_token',
      'user',
      'shop',
    ]);

    return {
      token: token[1],
      user: userStr[1] ? JSON.parse(userStr[1]) : null,
      shop: shopStr[1] ? JSON.parse(shopStr[1]) : null,
      isAuthenticated: !!token[1],
    };
  },
};

export default authService;
