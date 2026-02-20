import api from '@config/api';
import {
  Buy,
  BuyStatus,
  CreateBuyPayload,
  BuyListResponse,
} from '@types';

// Buy list params
export interface BuyListParams {
  search?: string;
  status?: BuyStatus;
  page?: number;
  per_page?: number;
}

// Parse buy response to ensure correct types
const parseBuy = (buy: any): Buy => ({
  ...buy,
  total_buy_amount: parseFloat(buy.total_buy_amount) || 0,
  total_sell_value: parseFloat(buy.total_sell_value) || 0,
  profit: parseFloat(buy.profit) || 0,
  loss: parseFloat(buy.loss) || 0,
  items_count: buy.items_count ?? (buy.items?.length || 0),
  items: (buy.items || []).map((item: any) => ({
    ...item,
    sell_price: parseFloat(item.sell_price) || 0,
    cost_basis: parseFloat(item.cost_basis) || 0,
  })),
  payments: (buy.payments || []).map((payment: any) => ({
    ...payment,
    // Handle both payment_method_id and method_id from API
    payment_method_id: parseInt(payment.payment_method_id || payment.method_id) || 0,
    amount: parseFloat(payment.amount) || 0,
  })),
});

// Get all buys with filters and pagination
export const getBuys = async (params?: BuyListParams): Promise<BuyListResponse> => {
  try {
    const response = await api.get('/buys', {params});
    return {
      data: (response.data.data || []).map(parseBuy),
      current_page: response.data.current_page || 1,
      last_page: response.data.last_page || 1,
      total: response.data.total || 0,
    };
  } catch (error) {
    return {data: [], current_page: 1, last_page: 1, total: 0};
  }
};

// Get single buy by ID
export const getBuyById = async (id: number): Promise<Buy | null> => {
  try {
    const response = await api.get(`/buys/${id}`);
    const rawData = response.data.data || response.data;
    // Debug: log raw payments from API
    return parseBuy(rawData);
  } catch (error) {
    return null;
  }
};

// Create new buy
export const createBuy = async (data: CreateBuyPayload): Promise<{success: boolean; data?: Buy; message?: string}> => {
  try {
    const response = await api.post('/buys', data);
    return {
      success: true,
      data: parseBuy(response.data.data || response.data),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to create buy',
    };
  }
};

// Update existing buy
export const updateBuy = async (
  id: number,
  data: Partial<CreateBuyPayload> & {new_customer?: NewCustomerPayload}
): Promise<{success: boolean; data?: Buy; message?: string}> => {
  try {
    const response = await api.put(`/buys/${id}`, data);
    return {
      success: true,
      data: parseBuy(response.data.data || response.data),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update buy',
    };
  }
};

// Save new customer for draft buy
export const saveNewCustomerToDraft = async (
  buyId: number,
  newCustomer: NewCustomerPayload
): Promise<{success: boolean; data?: any; message?: string}> => {
  try {
    const response = await api.put(`/buys/${buyId}`, {
      new_customer: newCustomer,
    });
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to save customer',
    };
  }
};

// Item payload type
export interface BuyItemPayload {
  name: string;
  quantity: number;
  condition: string;
  sell_price: number;
  cost_basis?: number;
  sku?: string;
}

// Payment payload type
export interface BuyPaymentPayload {
  method_id: number | string;
  amount: number;
}

// New customer payload type
export interface NewCustomerPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

// Add item to buy
export const addBuyItem = async (
  buyId: number,
  item: BuyItemPayload
): Promise<{success: boolean; data?: any; message?: string}> => {
  try {
    const response = await api.post(`/buys/${buyId}/items`, item);
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to add item',
    };
  }
};

// Update item in buy
export const updateBuyItem = async (
  buyId: number,
  itemId: number,
  item: Partial<BuyItemPayload>
): Promise<{success: boolean; data?: any; message?: string}> => {
  try {
    const response = await api.put(`/buys/${buyId}/items/${itemId}`, item);
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update item',
    };
  }
};

// Delete item from buy
export const deleteBuyItem = async (
  buyId: number,
  itemId: number
): Promise<{success: boolean; data?: any; message?: string}> => {
  try {
    const response = await api.delete(`/buys/${buyId}/items/${itemId}`);
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to delete item',
    };
  }
};

// Update buy payments (auto-save)
export const updateBuyPayments = async (
  buyId: number,
  payments: BuyPaymentPayload[]
): Promise<{success: boolean; data?: any; message?: string}> => {
  try {
    // Ensure payment amounts are numbers, not strings
    const cleanedPayments = payments.map(p => ({
      method_id: typeof p.method_id === 'string' ? parseInt(p.method_id as string) : p.method_id,
      amount: typeof p.amount === 'string' ? parseFloat(p.amount as string) : p.amount,
    }));

    const response = await api.put(`/buys/${buyId}/payments`, {payments: cleanedPayments});
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update payments',
    };
  }
};

// Save buy as pending with payments
export const saveBuyAsPending = async (
  id: number,
  payments?: BuyPaymentPayload[],
  storeCreditAmount?: number,
  newCustomer?: NewCustomerPayload,
  createdBy?: string
): Promise<{success: boolean; data?: any; message?: string}> => {
  try {
    // Ensure payment amounts are numbers, not strings
    const cleanedPayments = payments?.map(p => ({
      method_id: typeof p.method_id === 'string' ? parseInt(p.method_id as string) : p.method_id,
      amount: typeof p.amount === 'string' ? parseFloat(p.amount as string) : p.amount,
    }));

    if (newCustomer) {
    }

    const response = await api.post(`/buys/${id}/pending`, {
      payments: cleanedPayments,
      store_credit_amount: storeCreditAmount,
      new_customer: newCustomer,
      created_by: createdBy,
    });
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to save as pending',
    };
  }
};

// Complete buy with payments
export const completeBuy = async (
  id: number,
  payments?: BuyPaymentPayload[],
  storeCreditAmount?: number,
  newCustomer?: NewCustomerPayload,
  createdBy?: string
): Promise<{success: boolean; data?: any; message?: string}> => {
  try {
    // Ensure payment amounts are numbers, not strings
    const cleanedPayments = payments?.map(p => ({
      method_id: typeof p.method_id === 'string' ? parseInt(p.method_id as string) : p.method_id,
      amount: typeof p.amount === 'string' ? parseFloat(p.amount as string) : p.amount,
    }));

    if (newCustomer) {
    }

    const response = await api.post(`/buys/${id}/complete`, {
      payments: cleanedPayments,
      store_credit_amount: storeCreditAmount,
      new_customer: newCustomer,
      created_by: createdBy,
    });
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to complete buy',
    };
  }
};

// Add to inventory response type
export interface AddToInventoryResponse {
  success: boolean;
  message?: string;
  added?: number;
  merged?: number;
  items?: Array<{
    id: number;
    product_id: number;
    sku: string;
    merged: boolean;
  }>;
}

// Add items to inventory
export const addBuyItemsToInventory = async (
  buyId: number,
  itemIds: number[]
): Promise<AddToInventoryResponse> => {
  try {
    const response = await api.post(`/buys/${buyId}/add-to-inventory`, {item_ids: itemIds});
    return {
      success: true,
      message: response.data.message,
      added: response.data.added,
      merged: response.data.merged,
      items: response.data.items,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to add items to inventory',
    };
  }
};

// Remove from inventory response type
export interface RemoveFromInventoryResponse {
  success: boolean;
  message?: string;
  reduced?: number;
  deleted?: number;
}

// Remove items from inventory
export const removeBuyItemsFromInventory = async (
  buyId: number,
  itemIds: number[]
): Promise<RemoveFromInventoryResponse> => {
  try {
    const response = await api.post(`/buys/${buyId}/remove-from-inventory`, {item_ids: itemIds});
    return {
      success: true,
      message: response.data.message,
      reduced: response.data.reduced,
      deleted: response.data.deleted,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to remove from inventory',
    };
  }
};

// Upload photos for buy
export const uploadBuyPhotos = async (
  buyId: number,
  photos: FormData
): Promise<{success: boolean; data?: string[]; message?: string}> => {
  try {
    const response = await api.post(`/buys/${buyId}/photos`, photos, {
      headers: {'Content-Type': 'multipart/form-data'},
    });
    return {
      success: true,
      data: response.data.photos || [],
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to upload photos',
    };
  }
};

// Delete buy
export const deleteBuy = async (id: number): Promise<{success: boolean; message?: string}> => {
  try {
    await api.delete(`/buys/${id}`);
    return {success: true};
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to delete buy',
    };
  }
};

// Discard draft
export const discardBuyDraft = async (id: number): Promise<{success: boolean; message?: string}> => {
  return deleteBuy(id);
};

// Restore deleted buy
export const restoreBuy = async (id: number): Promise<{success: boolean; data?: Buy; message?: string}> => {
  try {
    const response = await api.post(`/buys/${id}/restore`);
    return {
      success: true,
      data: parseBuy(response.data.data || response.data),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to restore buy',
    };
  }
};
