import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {CompositeNavigationProp, useNavigation, CommonActions} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon} from 'react-native-paper';
import {TabParamList, RootStackParamList, SaleStackParamList} from '@types';
import {COLORS, SPACING, RADIUS} from '@constants/theme';
import Header from '@components/Header';
import {useCart} from '../context/CartContext';
import ProductSearchModal from '@components/ProductSearchModal';
import RecentProductsModal from '@components/RecentProductsModal';
import {authService} from '@services/authService';
import {Product} from '@services/productService';

type SaleScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<SaleStackParamList, 'Sale'>,
  CompositeNavigationProp<
    BottomTabNavigationProp<TabParamList, 'SaleTab'>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

const SaleScreen: React.FC = () => {
  const navigation = useNavigation<SaleScreenNavigationProp>();
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [recentModalVisible, setRecentModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    getSubtotal,
    isCustomItem,
  } = useCart();

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await authService.logout();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'Login'}],
      }),
    );
  };

  const quickActions = [
    {
      icon: 'barcode-scan',
      label: 'Scan',
      color: COLORS.purple,
      onPress: () => navigation.navigate('BarcodeScanner'),
    },
    {
      icon: 'magnify',
      label: 'Search',
      color: COLORS.pink,
      onPress: () => setSearchModalVisible(true),
    },
    {
      icon: 'history',
      label: 'Recent',
      color: COLORS.orange,
      onPress: () => setRecentModalVisible(true),
    },
  ];

  // Handle add product from search modal
  const handleAddToCart = (product: Product) => {
    addToCart(product);
  };

  // Handle checkout navigation
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Toast.show({
        type: 'info',
        text1: 'Empty Cart',
        text2: 'Please add products to checkout.',
      });
      return;
    }
    navigation.navigate('Checkout');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Header
        title="New Sale"
        showBackButton
        onBackPress={() => navigation.navigate('HomeTab')}
        onLogoutPress={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              onPress={action.onPress}>
              <View
                style={[
                  styles.actionIconContainer,
                  {backgroundColor: action.color + '20'},
                ]}>
                <Icon source={action.icon} size={28} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Actions */}
        <View style={styles.mainActions}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate('BarcodeScanner')}>
            <View style={styles.scanIconWrapper}>
              <Icon source="barcode-scan" size={32} color={COLORS.white} />
            </View>
            <View style={styles.scanTextWrapper}>
              <Text style={styles.scanTitle}>Scan Barcode</Text>
              <Text style={styles.scanSubtitle}>
                Use camera to scan product
              </Text>
            </View>
            <Icon source="chevron-right" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setSearchModalVisible(true)}>
            <View style={styles.searchIconWrapper}>
              <Icon source="magnify" size={32} color={COLORS.white} />
            </View>
            <View style={styles.searchTextWrapper}>
              <Text style={styles.searchTitle}>Search Products</Text>
              <Text style={styles.searchSubtitle}>Find by name or SKU</Text>
            </View>
            <Icon source="chevron-right" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Cart Section */}
        <Text style={styles.sectionTitle}>
          Cart {cartItems.length > 0 && `(${cartItems.length})`}
        </Text>

        {cartItems.length === 0 ? (
          <View style={styles.emptyCart}>
            <Icon source="cart-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyCartText}>Cart is empty</Text>
            <Text style={styles.emptyCartSubtext}>
              Search or scan products to add
            </Text>
          </View>
        ) : (
          <View style={styles.cartList}>
            {cartItems.map(item => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.cartItemIcon}>
                  <Icon
                    source="package-variant"
                    size={24}
                    color={COLORS.purple}
                  />
                </View>
                <View style={styles.cartItemInfo}>
                  <View style={styles.cartItemHeader}>
                    <Text style={styles.cartItemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromCart(item.id)}>
                      <Icon source="close" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                  {!isCustomItem(item) && (
                    <Text style={styles.cartItemSku}>SKU: {item.sku}</Text>
                  )}
                  {isCustomItem(item) && (
                    <Text style={styles.cartItemSku}>Custom Item</Text>
                  )}
                  <View style={styles.cartItemFooter}>
                    {!isCustomItem(item) && (
                      <Text style={styles.cartItemStock}>
                        Stock: {item.quantity}
                      </Text>
                    )}
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.id, item.cartQty - 1)}>
                        <Icon source="minus" size={16} color={COLORS.white} />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.cartQty}</Text>
                      <TouchableOpacity
                        style={[
                          styles.quantityButton,
                          !isCustomItem(item) && item.cartQty >= item.quantity && styles.quantityButtonDisabled,
                        ]}
                        onPress={() => {
                          if (isCustomItem(item)) {
                            updateQuantity(item.id, item.cartQty + 1);
                          } else if (item.cartQty < item.quantity) {
                            updateQuantity(item.id, item.cartQty + 1);
                          } else {
                            Toast.show({
                              type: 'info',
                              text1: 'Stock Limit',
                              text2: `Only ${item.quantity} available in stock.`,
                            });
                          }
                        }}>
                        <Icon source="plus" size={16} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cartItemPrice}>
                      ${(item.price * item.cartQty).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Checkout Button */}
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            cartItems.length === 0 && styles.checkoutButtonDisabled,
          ]}
          onPress={handleCheckout}>
          <Icon source="cash-register" size={24} color={COLORS.white} />
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
          <View style={styles.checkoutBadge}>
            <Text style={styles.checkoutBadgeText}>
              ${getSubtotal().toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Spacer for bottom tab */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Search Modal */}
      <ProductSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        onAddToCart={handleAddToCart}
      />

      {/* Recent Products Modal */}
      <RecentProductsModal
        visible={recentModalVisible}
        onClose={() => setRecentModalVisible(false)}
        onAddToCart={handleAddToCart}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
  },
  actionButton: {
    alignItems: 'center',
    width: '30%',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  actionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  mainActions: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    borderRadius: 16,
    padding: SPACING.md,
  },
  scanIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTextWrapper: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  scanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  scanSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.pink + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchTextWrapper: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  searchSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyCart: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  cartList: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cartItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  cartItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.white,
    flex: 1,
    marginRight: SPACING.sm,
    lineHeight: 20,
  },
  cartItemSku: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  cartItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  cartItemStock: {
    fontSize: 11,
    color: COLORS.green,
    flex: 1,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginHorizontal: SPACING.sm,
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green,
    marginLeft: SPACING.md,
    minWidth: 55,
    textAlign: 'right',
  },
  removeButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: COLORS.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderRadius: 16,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  bottomSpacer: {
    height: 80,
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  checkoutBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  checkoutBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default SaleScreen;
