import React, {createContext, useContext, useState, useCallback} from 'react';
import {Product, CartItem, CustomCartItem} from '@services/productService';

// Combined cart item type
export type CombinedCartItem = CartItem | CustomCartItem;

// Custom product form data
export interface CustomProductForm {
  name: string;
  cost: number;
  price: number;
  quantity: number;
}

interface CartContextType {
  cartItems: CombinedCartItem[];
  addToCart: (product: Product) => boolean; // returns false if stock limit reached
  addCustomProduct: (customProduct: CustomProductForm) => void;
  removeFromCart: (itemId: number | string) => void;
  updateQuantity: (itemId: number | string, quantity: number) => void;
  updateCustomQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  canAddMore: (productId: number, availableQty: number) => boolean;
  isCustomItem: (item: CombinedCartItem) => item is CustomCartItem;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const TAX_RATE = 0.1; // 10% tax

// Type guard for custom items
const isCustomItem = (item: CombinedCartItem): item is CustomCartItem => {
  return 'is_custom' in item && item.is_custom === true;
};

// Get item ID (works for both regular and custom items)
const getItemId = (item: CombinedCartItem): number | string => {
  return item.id;
};

export const CartProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [cartItems, setCartItems] = useState<CombinedCartItem[]>([]);

  // Check if can add more of a product
  const canAddMore = useCallback(
    (productId: number, availableQty: number) => {
      const existingItem = cartItems.find(item => item.id === productId);
      const currentQty = existingItem ? existingItem.cartQty : 0;
      return currentQty < availableQty;
    },
    [cartItems],
  );

  // Add product to cart or increase quantity if exists
  // Returns false if stock limit reached
  const addToCart = useCallback((product: Product): boolean => {
    const existingItem = cartItems.find(item => item.id === product.id);
    const currentQty = existingItem ? existingItem.cartQty : 0;

    // Check stock limit
    if (currentQty >= product.quantity) {
      return false; // Cannot add more - stock limit reached
    }

    setCartItems(prevItems => {
      const existing = prevItems.find(item => item.id === product.id);

      if (existing) {
        // Increase quantity if already in cart
        return prevItems.map(item =>
          item.id === product.id
            ? {...item, cartQty: Math.min(item.cartQty + 1, product.quantity)}
            : item,
        );
      } else {
        // Add new item with quantity 1
        return [...prevItems, {...product, cartQty: 1}];
      }
    });
    return true;
  }, [cartItems]);

  // Add custom product to cart
  const addCustomProduct = useCallback((customProduct: CustomProductForm) => {
    const customItem: CustomCartItem = {
      id: `custom_${Date.now()}`,
      is_custom: true,
      name: customProduct.name,
      cost: customProduct.cost,
      price: customProduct.price,
      cartQty: customProduct.quantity,
    };
    setCartItems(prevItems => [...prevItems, customItem]);
  }, []);

  // Remove product from cart completely
  const removeFromCart = useCallback((itemId: number | string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);

  // Update quantity for a specific product (limited to available stock for regular items)
  const updateQuantity = useCallback((itemId: number | string, quantity: number) => {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      setCartItems(prevItems =>
        prevItems.filter(item => item.id !== itemId),
      );
    } else {
      setCartItems(prevItems =>
        prevItems.map(item => {
          if (item.id !== itemId) return item;

          // For custom items, no stock limit
          if (isCustomItem(item)) {
            return {...item, cartQty: quantity};
          }

          // For regular items, limit to available stock
          return {...item, cartQty: Math.min(quantity, item.quantity)};
        }),
      );
    }
  }, []);

  // Update quantity for custom product (no stock limit)
  const updateCustomQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? {...item, cartQty: quantity} : item,
        ),
      );
    }
  }, []);

  // Clear all items from cart
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Calculate subtotal (before tax)
  const getSubtotal = useCallback(() => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.cartQty,
      0,
    );
  }, [cartItems]);

  // Calculate tax
  const getTax = useCallback(() => {
    return getSubtotal() * TAX_RATE;
  }, [getSubtotal]);

  // Calculate total (subtotal + tax)
  const getTotal = useCallback(() => {
    return getSubtotal() + getTax();
  }, [getSubtotal, getTax]);

  // Get total item count
  const getItemCount = useCallback(() => {
    return cartItems.reduce((count, item) => count + item.cartQty, 0);
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        addCustomProduct,
        removeFromCart,
        updateQuantity,
        updateCustomQuantity,
        clearCart,
        getSubtotal,
        getTax,
        getTotal,
        getItemCount,
        canAddMore,
        isCustomItem,
      }}>
      {children}
    </CartContext.Provider>
  );
};

// Hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
