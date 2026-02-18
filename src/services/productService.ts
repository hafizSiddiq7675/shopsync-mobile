import api from '@config/api';

// Product from API (raw response)
interface ProductResponse {
  id: number;
  shop_id?: number;
  name: string;
  sku: string;
  price: string | number;
  quantity: number;
  cost?: string | number;
  status: 'available' | 'unavailable';
  condition?: string;
}

// Product for app usage (parsed)
export interface Product {
  id: number;
  shop_id?: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  cost: number;
  status: 'available' | 'unavailable';
  condition?: string;
}

// Product in cart with quantity to purchase
export interface CartItem extends Product {
  cartQty: number;
}

// Transaction item for API (regular product)
export interface TransactionItem {
  product_id: number;
  quantity: number;
  price: number;
}

// Custom product transaction item
export interface CustomTransactionItem {
  is_custom: true;
  name: string;
  cost: number;
  price: number;
  quantity: number;
}

// Custom product in cart
export interface CustomCartItem {
  id: string; // Unique ID for cart management (e.g., 'custom_1234567890')
  is_custom: true;
  name: string;
  cost: number;
  price: number;
  cartQty: number;
}

// Payment item for transaction
export interface PaymentItem {
  payment_method_id: number; // 1 = cash, 2 = card
  amount: number;
}

// New customer data for transaction
export interface NewCustomerData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  note?: string | null;
}

// Transaction payload for checkout
export interface TransactionPayload {
  items: (TransactionItem | CustomTransactionItem)[];
  payments: PaymentItem[];
  customer_id?: number | null;
  new_customer?: NewCustomerData;
  subtotal: number;
  tax: number;
  total: number;
  points_used?: number;
  store_credit_used?: number;
  notes?: string;
}

// Parse product response to convert string prices to numbers
const parseProduct = (product: ProductResponse): Product => ({
  id: product.id,
  shop_id: product.shop_id,
  name: product.name,
  sku: product.sku,
  price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
  quantity: product.quantity,
  cost: typeof product.cost === 'string' ? parseFloat(product.cost) : (product.cost || 0),
  status: product.status,
  condition: product.condition,
});

// Search products by name or SKU
export const searchProducts = async (query: string): Promise<Product[]> => {
  try {
    const response = await api.get('/products/search', {
      params: {query},
    });

    const products = response.data.products || response.data || [];
    return products.map(parseProduct);
  } catch (error) {
    return [];
  }
};

// Get product by barcode/SKU
export const getProductBySku = async (sku: string): Promise<Product | null> => {
  try {
    const response = await api.get(`/products/scan/${sku}`);
    const product = response.data.product || response.data;

    if (!product) {
      return null;
    }

    return parseProduct(product);
  } catch (error) {
    return null;
  }
};

// Get recently sold products
export const getRecentProducts = async (): Promise<Product[]> => {
  try {
    const response = await api.get('/products/recent');
    const products = response.data.products || response.data || [];
    return products.map(parseProduct);
  } catch (error) {
    return [];
  }
};

// Complete a sale transaction
export const createTransaction = async (
  payload: TransactionPayload,
): Promise<{success: boolean; transaction_id?: number; message?: string; errors?: string[]}> => {
  try {
    const response = await api.post('/transactions', payload);

    if (response.data.success) {
      return {
        success: true,
        transaction_id: response.data.data?.transaction_id || response.data.transaction_id,
      };
    }

    return {
      success: false,
      message: response.data.message || 'Transaction failed',
      errors: response.data.errors,
    };
  } catch (error: any) {
    const errorData = error.response?.data;

    return {
      success: false,
      message: errorData?.message || 'Transaction failed',
      errors: errorData?.errors,
    };
  }
};

// Dashboard stats response
export interface DashboardStats {
  today_sales: number;
  today_orders: number;
  today_products_sold: number;
  today_customers: number;
}

// Get dashboard stats for today
export const getDashboardStats = async (): Promise<DashboardStats | null> => {
  try {
    const response = await api.get('/dashboard/stats');

    if (response.data.success && response.data.data) {
      return {
        today_sales: response.data.data.today_sales || 0,
        today_orders: response.data.data.today_orders || 0,
        today_products_sold: response.data.data.today_products_sold || 0,
        today_customers: response.data.data.today_customers || 0,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
};

// Barcode response type
export interface BarcodeData {
  id: number;
  name: string;
  sku: string;
  barcode: string; // Base64 image data
}

export interface SingleBarcodeResponse {
  success: boolean;
  data?: BarcodeData;
  message?: string;
}

export interface BulkBarcodeResponse {
  success: boolean;
  count?: number;
  data?: BarcodeData[];
  message?: string;
}

// Get single product barcode by SKU
export const getProductBarcode = async (sku: string): Promise<SingleBarcodeResponse> => {
  try {
    const response = await api.get(`/products/barcode/${sku}`);
    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch barcode',
    };
  }
};

// Get bulk product barcodes by SKUs
export const getProductBarcodes = async (skus: string[]): Promise<BulkBarcodeResponse> => {
  try {
    const response = await api.post('/products/barcodes', {skus});
    return {
      success: true,
      count: response.data.count,
      data: response.data.data || [],
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch barcodes',
    };
  }
};
