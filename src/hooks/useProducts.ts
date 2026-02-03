import {useQuery} from '@tanstack/react-query';
import {productApi} from '../services/api';
import {Product} from '../types';

// Fetch all products
export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const response = await productApi.getAll();
      return response.data.data;
    },
  });
};

// Fetch single product by ID
export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async (): Promise<Product> => {
      const response = await productApi.getById(id);
      return response.data.data;
    },
    enabled: !!id, // Only run if id is provided
  });
};

// Search products
export const useProductSearch = (query: string) => {
  return useQuery({
    queryKey: ['products', 'search', query],
    queryFn: async (): Promise<Product[]> => {
      const response = await productApi.search(query);
      return response.data.data;
    },
    enabled: query.length > 2, // Only search if query is > 2 chars
  });
};
