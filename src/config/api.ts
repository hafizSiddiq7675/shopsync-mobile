import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL - Production API
const API_URL = 'https://app.hobbydex.net/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add token to every request automatically
api.interceptors.request.use(
  async config => {
    console.log('API Request:', config.method?.toUpperCase(), (config.baseURL || '') + (config.url || ''));
    console.log('Request Data:', config.data);

    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.log('Request Error:', error);
    return Promise.reject(error);
  },
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
