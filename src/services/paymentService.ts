import api from '@config/api';

export interface PaymentMethod {
  id: number;
  name: string;
}

// Get all available payment methods
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
