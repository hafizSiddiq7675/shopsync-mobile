import axios from 'axios';
import {Product, User, ApiResponse} from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'https://api.example.com', // Replace with your API URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  config => {
    // Add token from storage if available
    // const token = await AsyncStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor - handle errors
api.interceptors.response.use(
  response => response,
  error => {
    // Handle common errors (401, 500, etc.)
    if (error.response?.status === 401) {
      // Handle unauthorized - logout user
    }
    return Promise.reject(error);
  },
);

// API functions
export const productApi = {
  getAll: () => api.get<ApiResponse<Product[]>>('/products'),
  getById: (id: string) => api.get<ApiResponse<Product>>(`/products/${id}`),
  search: (query: string) => api.get<ApiResponse<Product[]>>(`/products/search?q=${query}`),
};

export const userApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{user: User; token: string}>>('/auth/login', {email, password}),
  register: (name: string, email: string, password: string) =>
    api.post<ApiResponse<{user: User; token: string}>>('/auth/register', {name, email, password}),
  getProfile: () => api.get<ApiResponse<User>>('/user/profile'),
};

export default api;
