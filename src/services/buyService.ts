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
    console.error('Error fetching buys:', error);
    return {data: [], current_page: 1, last_page: 1, total: 0};
  }
};

// Get single buy by ID
export const getBuyById = async (id: number): Promise<Buy | null> => {
  try {
    const response = await api.get(`/buys/${id}`);
    return parseBuy(response.data.data || response.data);
  } catch (error) {
    console.error('Error fetching buy:', error);
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
    console.error('Error creating buy:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to create buy',
    };
  }
};

// Update existing buy
export const updateBuy = async (
  id: number,
  data: Partial<CreateBuyPayload>
): Promise<{success: boolean; data?: Buy; message?: string}> => {
  try {
    const response = await api.put(`/buys/${id}`, data);
    return {
      success: true,
      data: parseBuy(response.data.data || response.data),
    };
  } catch (error: any) {
    console.error('Error updating buy:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update buy',
    };
  }
};

// Save buy as pending
export const saveBuyAsPending = async (id: number): Promise<{success: boolean; message?: string}> => {
  try {
    await api.post(`/buys/${id}/pending`);
    return {success: true};
  } catch (error: any) {
    console.error('Error saving buy as pending:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to save as pending',
    };
  }
};

// Complete buy
export const completeBuy = async (id: number): Promise<{success: boolean; message?: string}> => {
  try {
    await api.post(`/buys/${id}/complete`);
    return {success: true};
  } catch (error: any) {
    console.error('Error completing buy:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to complete buy',
    };
  }
};

// Add items to inventory
export const addBuyItemsToInventory = async (
  buyId: number,
  itemIds: number[]
): Promise<{success: boolean; message?: string}> => {
  try {
    await api.post(`/buys/${buyId}/add-to-inventory`, {item_ids: itemIds});
    return {success: true};
  } catch (error: any) {
    console.error('Error adding items to inventory:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to add items to inventory',
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
    console.error('Error uploading photos:', error);
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
    console.error('Error deleting buy:', error);
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
