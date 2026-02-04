import React, {createContext, useContext, useState, useCallback} from 'react';
import {Product, CartItem} from '@services/productService';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product) => boolean; // returns false if stock limit reached
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  canAddMore: (productId: number, availableQty: number) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const TAX_RATE = 0.1; // 10% tax

export const CartProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

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

  // Remove product from cart completely
  const removeFromCart = useCallback((productId: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  }, []);

  // Update quantity for a specific product (limited to available stock)
  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      setCartItems(prevItems =>
        prevItems.filter(item => item.id !== productId),
      );
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId
            ? {...item, cartQty: Math.min(quantity, item.quantity)} // Limit to available stock
            : item,
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
        removeFromCart,
        updateQuantity,
        clearCart,
        getSubtotal,
        getTax,
        getTotal,
        getItemCount,
        canAddMore,
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
