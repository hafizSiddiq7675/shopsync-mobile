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

// Buy Stack Navigation types (nested in BuyTab)
export type BuyStackParamList = {
  BuyList: undefined;
  BuyDetails: {buyId: number};
  BuyWizard: {buyId?: number};
};

// Buy Wizard Stack Navigation types (nested in BuyStack)
export type BuyWizardStackParamList = {
  Step1Customer: undefined;
  Step2Payment: undefined;
  Step3Items: undefined;
  Step4Review: undefined;
  Step5Complete: undefined;
};

// Buy Module Types
export type BuyStatus = 'draft' | 'pending' | 'completed' | 'cancelled' | 'deleted';
export type CostEntryMode = 'manual' | 'allocate';
export type ItemCondition = 'new' | 'nm' | 'lp' | 'mp' | 'hp' | 'dmg';

export interface BuyItem {
  id: number;
  name: string;
  quantity: number;
  condition: ItemCondition;
  sell_price: number;
  cost_basis: number;
  sku?: string;
  product_id?: number;
  added_to_inventory: boolean;
}

export interface BuyPayment {
  id: string;
  payment_method_id: number;
  payment_method_name: string;
  amount: number;
}

export interface Buy {
  id: number;
  buy_number: string;
  customer_id?: number;
  customer?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  status: BuyStatus;
  cost_entry_mode: CostEntryMode;
  total_buy_amount: number;
  total_sell_value: number;
  profit: number;
  loss: number;
  items_count: number;
  items: BuyItem[];
  payments: BuyPayment[];
  photos: string[];
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateBuyItemPayload {
  name: string;
  quantity: number;
  condition: ItemCondition;
  sell_price: number;
  cost_basis: number;
  sku?: string;
}

export interface CreateBuyPaymentPayload {
  payment_method_id: number;
  amount: number;
}

export interface CreateBuyPayload {
  customer_id?: number;
  new_customer?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    note?: string;
  };
  cost_entry_mode: CostEntryMode;
  items: CreateBuyItemPayload[];
  payments: CreateBuyPaymentPayload[];
  notes?: string;
}

export interface BuyListResponse {
  data: Buy[];
  current_page: number;
  last_page: number;
  total: number;
}
