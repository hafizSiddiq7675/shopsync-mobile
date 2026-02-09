import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {Icon} from 'react-native-paper';
import {COLORS, SPACING} from '@constants/theme';
import {Product, getRecentProducts} from '@services/productService';
import {useCart} from '../context/CartContext';

interface RecentProductsModalProps {
  visible: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

const RecentProductsModal: React.FC<RecentProductsModalProps> = ({
  visible,
  onClose,
  onAddToCart,
}) => {
  const {canAddMore, cartItems, updateQuantity, removeFromCart} = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load recent products when modal opens
  useEffect(() => {
    if (visible) {
      loadRecentProducts();
    }
  }, [visible]);

  // Fetch recent products from API
  const loadRecentProducts = async () => {
    setIsLoading(true);
    const recentProducts = await getRecentProducts();
    setProducts(recentProducts);
    setIsLoading(false);
  };

  // Pull to refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    const recentProducts = await getRecentProducts();
    setProducts(recentProducts);
    setIsRefreshing(false);
  };

  // Get current cart quantity for a product
  const getCartQty = (productId: number) => {
    const item = cartItems.find(i => i.id === productId);
    return item ? item.cartQty : 0;
  };

  // Get cart item for a product
  const getCartItem = (productId: number) => {
    return cartItems.find(i => i.id === productId);
  };

  // Handle add to cart
  const handleAddProduct = (product: Product) => {
    if (!canAddMore(product.id, product.quantity)) {
      Toast.show({
        type: 'info',
        text1: 'Stock Limit',
        text2: `Maximum ${product.quantity} available`,
      });
      return;
    }
    onAddToCart(product);
  };

  // Handle increase quantity
  const handleIncrease = (product: Product) => {
    const cartItem = getCartItem(product.id);
    if (!cartItem) return;

    if (!canAddMore(product.id, product.quantity)) {
      Toast.show({
        type: 'info',
        text1: 'Stock Limit',
        text2: `Maximum ${product.quantity} available`,
      });
      return;
    }
    updateQuantity(product.id, cartItem.cartQty + 1);
  };

  // Handle decrease quantity
  const handleDecrease = (product: Product) => {
    const cartItem = getCartItem(product.id);
    if (!cartItem) return;

    if (cartItem.cartQty > 1) {
      updateQuantity(product.id, cartItem.cartQty - 1);
    } else {
      // Remove if quantity would be 0
      removeFromCart(product.id);
    }
  };

  // Handle remove from cart
  const handleRemove = (product: Product) => {
    removeFromCart(product.id);
    Toast.show({
      type: 'info',
      text1: 'Removed',
      text2: `${product.name} removed from cart`,
      visibilityTime: 1500,
    });
  };

  // Handle close
  const handleClose = () => {
    onClose();
  };

  // Render compact product item
  const renderProductItem = ({item}: {item: Product}) => {
    const cartQty = getCartQty(item.id);
    const isInCart = cartQty > 0;
    const isOutOfStock = item.quantity === 0;
    const canAddMore_ = canAddMore(item.id, item.quantity);

    return (
      <View
        style={[
          styles.productItem,
          isOutOfStock && styles.productItemDisabled,
        ]}>
        {/* Left: Icon */}
        <View
          style={[
            styles.productIcon,
            isOutOfStock && styles.productIconOutOfStock,
            isInCart && styles.productIconInCart,
          ]}>
          <Icon
            source="package-variant"
            size={18}
            color={isOutOfStock ? COLORS.danger : isInCart ? COLORS.purple : COLORS.orange}
          />
        </View>

        {/* Center: Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.productMeta}>
            <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
            <Text style={styles.dotSeparator}>•</Text>
            {isOutOfStock ? (
              <Text style={styles.stockDanger}>Out of Stock</Text>
            ) : (
              <Text style={styles.stockText}>Stock: {item.quantity}</Text>
            )}
          </View>
        </View>

        {/* Right: Controls */}
        <View style={styles.productControls}>
          {isOutOfStock ? (
            <View style={styles.outOfStockBadge}>
              <Icon source="close" size={14} color={COLORS.danger} />
            </View>
          ) : isInCart ? (
            // Quantity Controls
            <View style={styles.quantityControls}>
              {/* Decrease / Remove Button */}
              <TouchableOpacity
                style={[styles.qtyButton, styles.qtyButtonMinus]}
                onPress={() => handleDecrease(item)}
                activeOpacity={0.7}>
                <Icon
                  source={cartQty === 1 ? 'trash-can-outline' : 'minus'}
                  size={14}
                  color={cartQty === 1 ? COLORS.danger : COLORS.white}
                />
              </TouchableOpacity>

              {/* Quantity Display */}
              <View style={styles.qtyDisplay}>
                <Text style={styles.qtyText}>{cartQty}</Text>
              </View>

              {/* Increase Button */}
              <TouchableOpacity
                style={[
                  styles.qtyButton,
                  styles.qtyButtonPlus,
                  !canAddMore_ && styles.qtyButtonDisabled,
                ]}
                onPress={() => handleIncrease(item)}
                disabled={!canAddMore_}
                activeOpacity={0.7}>
                <Icon source="plus" size={14} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ) : (
            // Add to Cart Button
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddProduct(item)}
              activeOpacity={0.7}>
              <Icon source="plus" size={16} color={COLORS.white} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Icon source="history" size={18} color={COLORS.orange} />
              </View>
              <View>
                <Text style={styles.title}>Recently Sold</Text>
                <Text style={styles.subtitle}>
                  {cartItems.length > 0
                    ? `${cartItems.length} item${cartItems.length > 1 ? 's' : ''} in cart`
                    : 'Tap to quick-add'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon source="close" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {isLoading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={COLORS.orange} />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : products.length > 0 ? (
              <FlatList
                data={products}
                keyExtractor={item => item.id.toString()}
                renderItem={renderProductItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor={COLORS.orange}
                    colors={[COLORS.orange]}
                  />
                }
              />
            ) : (
              <View style={styles.centerContent}>
                <View style={styles.emptyIcon}>
                  <Icon source="history" size={28} color={COLORS.textMuted} />
                </View>
                <Text style={styles.emptyText}>No Recent Products</Text>
                <Text style={styles.emptySubtext}>
                  Products you sell will appear here
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.darkBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: '40%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.orange + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.sm,
  },
  separator: {
    height: 6,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    marginTop: SPACING.xs,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  // Product Item Styles
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: SPACING.sm,
  },
  productItemDisabled: {
    opacity: 0.5,
  },
  productIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.orange + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productIconOutOfStock: {
    backgroundColor: COLORS.danger + '15',
  },
  productIconInCart: {
    backgroundColor: COLORS.purple + '15',
  },
  productInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
    marginRight: SPACING.sm,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.white,
    marginBottom: 2,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.green,
  },
  dotSeparator: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginHorizontal: 4,
  },
  stockText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  stockDanger: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '500',
  },
  productControls: {
    alignItems: 'flex-end',
  },
  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orange,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Quantity Controls
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 6,
    padding: 2,
  },
  qtyButton: {
    width: 26,
    height: 26,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonMinus: {
    backgroundColor: COLORS.cardBg,
  },
  qtyButtonPlus: {
    backgroundColor: COLORS.purple,
  },
  qtyButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.5,
  },
  qtyDisplay: {
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  outOfStockBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RecentProductsModal;
