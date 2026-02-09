// User types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Auth User (from API)
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  shop_id: number;
}

// Shop type
export interface Shop {
  id: number;
  name: string;
  points_enabled: boolean;
  store_credit_enabled: boolean;
}

// Auth State
export interface AuthState {
  user: AuthUser | null;
  shop: Shop | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Product types
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
}

// Cart types
export interface CartItem {
  product: Product;
  quantity: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  ProductDetail: {productId: string};
  Cart: undefined;
  Checkout: undefined;
  BarcodeScanner: undefined;
};

// Tab Navigation types
export type TabParamList = {
  HomeTab: undefined;
  SaleTab: undefined;
  BuyTab: undefined;
  SettingsTab: undefined;
};

// Sale Stack Navigation types (nested in SaleTab)
export type SaleStackParamList = {
  Sale: undefined;
  Checkout: undefined;
};
