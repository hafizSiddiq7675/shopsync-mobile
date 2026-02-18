import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

// ===========================================
// API CONFIGURATION
// ===========================================

// Production API URL
const PRODUCTION_API_URL = 'https://app.hobbydex.net/api';

// Development API URLs
const DEV_API_URL_IOS = 'http://localhost:8000/api';
const DEV_API_URL_ANDROID = 'http://10.0.2.2:8000/api';

// API Timeout (in milliseconds)
const API_TIMEOUT = 10000;

// ===========================================
// AUTO-SELECT URL BASED ON BUILD TYPE
// ===========================================
// __DEV__ is true for debug builds, false for release builds

const getApiUrl = (): string => {
  if (__DEV__) {
    // Development: use local server
    return Platform.OS === 'android' ? DEV_API_URL_ANDROID : DEV_API_URL_IOS;
  }
  // Production: use live server
  return PRODUCTION_API_URL;
};

const API_URL = getApiUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add token to every request automatically
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

// Handle responses and errors
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token invalid - clear storage
      await AsyncStorage.multiRemove(['auth_token', 'user', 'shop']);
    }
    return Promise.reject(error);
  },
);

export default api;
export {API_URL};
