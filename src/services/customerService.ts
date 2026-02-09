import api from '@config/api';

// Customer from API
export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  allow_points: boolean;
  allow_store_credit: boolean;
  points_balance: number;
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
  store_credit_balance: number;
  lifetime_store_credit_earned: number;
  lifetime_store_credit_used: number;
}

// Search result customer (minimal info)
export interface CustomerSearchResult {
  id: number;
  name: string;
  email: string;
  phone?: string;
  allow_points: boolean;
  allow_store_credit: boolean;
}

// Search customers by name, email, or phone
export const searchCustomers = async (query: string): Promise<CustomerSearchResult[]> => {
  try {
    if (!query || query.length < 2) {
      return [];
    }

    const response = await api.get('/customers/search', {
      params: {query},
    });

    return response.data.customers || response.data || [];
  } catch (error) {
    console.log('Customer search error:', error);
    return [];
  }
};

// Get customer details with balances
export const getCustomerDetails = async (customerId: number): Promise<Customer | null> => {
  try {
    const response = await api.get(`/customers/${customerId}`);
    const customer = response.data.customer || response.data;

    if (!customer) {
      return null;
    }

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      allow_points: customer.allow_points ?? true,
      allow_store_credit: customer.allow_store_credit ?? true,
      points_balance: parseFloat(customer.points_balance) || 0,
      lifetime_points_earned: parseInt(customer.lifetime_points_earned) || 0,
      lifetime_points_redeemed: parseInt(customer.lifetime_points_redeemed) || 0,
      store_credit_balance: parseFloat(customer.store_credit_balance) || 0,
      lifetime_store_credit_earned: parseFloat(customer.lifetime_store_credit_earned) || 0,
      lifetime_store_credit_used: parseFloat(customer.lifetime_store_credit_used) || 0,
    };
  } catch (error) {
    console.log('Get customer error:', error);
    return null;
  }
};

// Get customer points balance and history
export const getCustomerPoints = async (customerId: number): Promise<{balance: number; history: any[]} | null> => {
  try {
    const response = await api.get(`/customers/${customerId}/points`);
    return {
      balance: parseFloat(response.data.balance) || 0,
      history: response.data.history || [],
    };
  } catch (error) {
    console.log('Get points error:', error);
    return null;
  }
};

// Get customer store credit balance and history
export const getCustomerStoreCredit = async (customerId: number): Promise<{balance: number; history: any[]} | null> => {
  try {
    const response = await api.get(`/customers/${customerId}/store-credit`);
    return {
      balance: parseFloat(response.data.balance) || 0,
      history: response.data.history || [],
    };
  } catch (error) {
    console.log('Get store credit error:', error);
    return null;
  }
};
