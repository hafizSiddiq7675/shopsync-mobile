import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {Icon} from 'react-native-paper';
import {COLORS, SPACING, RADIUS, SHADOWS} from '@constants/theme';
import {Product, searchProducts} from '@services/productService';
import {useCart} from '../context/CartContext';
import DraggableBottomSheet from './DraggableBottomSheet';

interface ProductSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

const ProductSearchModal: React.FC<ProductSearchModalProps> = ({
  visible,
  onClose,
  onAddToCart,
}) => {
  const {canAddMore, cartItems} = useCart();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Get current cart quantity for a product
  const getCartQty = (productId: number) => {
    const item = cartItems.find(i => i.id === productId);
    return item ? item.cartQty : 0;
  };

  // Search with debounce
  const handleSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);

    if (searchQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    const products = await searchProducts(searchQuery);
    setResults(products);
    setIsLoading(false);
  }, []);

  // Handle add to cart
  const handleAddProduct = (product: Product) => {
    // Check if can add more
    if (!canAddMore(product.id, product.quantity)) {
      Toast.show({
        type: 'info',
        text1: 'Stock Limit',
        text2: `Cannot add more. You already have all ${product.quantity} available in cart.`,
      });
      return;
    }

    onAddToCart(product);
    // Clear and close
    setQuery('');
    setResults([]);
    setHasSearched(false);
    onClose();
  };

  // Handle close
  const handleClose = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    onClose();
  };

  // Render product item
  const renderProduct = ({item}: {item: Product}) => {
    const cartQty = getCartQty(item.id);
    const availableToAdd = item.quantity - cartQty;
    const isOutOfStock = item.quantity === 0;
    const isMaxInCart = availableToAdd <= 0;

    return (
      <TouchableOpacity
        style={[
          styles.productItem,
          (isOutOfStock || isMaxInCart) && styles.productItemDisabled,
        ]}
        onPress={() => handleAddProduct(item)}
        disabled={isOutOfStock || isMaxInCart}>
        <View style={styles.productIcon}>
          <Icon source="package-variant" size={24} color={COLORS.purple} />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productSku}>SKU: {item.sku}</Text>
          <View style={styles.stockRow}>
            <Text
              style={[
                styles.stockText,
                isOutOfStock && styles.stockTextDanger,
                isMaxInCart && !isOutOfStock && styles.stockTextWarning,
              ]}>
              {isOutOfStock
                ? 'Out of Stock'
                : isMaxInCart
                ? `All ${item.quantity} in cart`
                : `Stock: ${item.quantity}`}
            </Text>
            {cartQty > 0 && !isOutOfStock && (
              <Text style={styles.cartQtyText}> (In cart: {cartQty})</Text>
            )}
          </View>
        </View>
        <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
        <View
          style={[
            styles.addButton,
            (isOutOfStock || isMaxInCart) && styles.addButtonDisabled,
          ]}>
          <Icon
            source={isOutOfStock || isMaxInCart ? 'close' : 'plus'}
            size={20}
            color={COLORS.white}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={handleClose}
      minHeight="60%"
      maxHeight="85%"
      avoidKeyboard>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Icon source="magnify" size={20} color={COLORS.purple} />
          </View>
          <Text style={styles.title}>Search Products</Text>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Icon source="close" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Icon source="magnify" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or SKU..."
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon source="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.purple} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={item => item.id.toString()}
            renderItem={renderProduct}
            showsVerticalScrollIndicator={false}
          />
        ) : hasSearched ? (
          <View style={styles.centerContent}>
            <Icon source="magnify-close" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              Try a different search term
            </Text>
          </View>
        ) : (
          <View style={styles.centerContent}>
            <Icon source="magnify" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Search Products</Text>
            <Text style={styles.emptySubtext}>
              Enter product name or SKU
            </Text>
          </View>
        )}
      </View>
    </DraggableBottomSheet>
  );
};

const styles = StyleSheet.create({
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
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.white,
    paddingVertical: SPACING.md,
    marginLeft: SPACING.sm,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    marginTop: SPACING.xs,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.white,
  },
  productSku: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.green,
    marginRight: SPACING.md,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.purpleGlow,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  productItemDisabled: {
    opacity: 0.6,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  stockText: {
    fontSize: 12,
    color: COLORS.green,
    fontWeight: '500',
  },
  stockTextDanger: {
    color: COLORS.danger,
  },
  stockTextWarning: {
    color: COLORS.orange,
  },
  cartQtyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default ProductSearchModal;
