import api from '@config/api';

export interface PaymentMethod {
  id: number;
  name: string;
}

// Get all available payment methods (POS/Sale)
export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
    const response = await api.get('/payment-methods');

    if (response.data.success && response.data.payment_methods) {
      return response.data.payment_methods;
    }

    return [];
  } catch (error) {
    console.log('Payment methods error:', error);
    return [];
  }
};

// Get payment methods for Buy module
export const getBuyPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
    const response = await api.get('/payment-methods/buy');

    if (response.data.success && response.data.payment_methods) {
      return response.data.payment_methods;
    }

    return [];
  } catch (error) {
    console.log('Buy payment methods error:', error);
    return [];
  }
};
