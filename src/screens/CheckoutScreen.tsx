import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Toast from 'react-native-toast-message';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation, CommonActions} from '@react-navigation/native';
import {Icon} from 'react-native-paper';
import {SaleStackParamList} from '@types';
import {COLORS, SPACING, RADIUS, SHADOWS} from '@constants/theme';
import Header from '@components/Header';
import {useCart, CustomProductForm} from '../context/CartContext';
import {createTransaction, TransactionPayload, CustomTransactionItem} from '@services/productService';
import {getPaymentMethods, PaymentMethod} from '@services/paymentService';
import {
  searchCustomers,
  getCustomerDetails,
  Customer,
  CustomerSearchResult,
} from '@services/customerService';
import {authService} from '@services/authService';
import DraggableBottomSheet from '../components/DraggableBottomSheet';

type CheckoutScreenNavigationProp = NativeStackNavigationProp<
  SaleStackParamList,
  'Checkout'
>;

// Payment entry for split payments
interface PaymentEntry {
  id: string;
  payment_method_id: number;
  amount: string;
}

// New customer form data
interface NewCustomerForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  note: string;
}

// Preset amounts for Points and Store Credit
const PRESET_AMOUNTS = [5, 10, 25];

// Custom product form interface
interface CustomProductFormState {
  name: string;
  cost: string;
  price: string;
  quantity: string;
}

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const {cartItems, getSubtotal, clearCart, updateQuantity, removeFromCart, canAddMore, addCustomProduct, isCustomItem} = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(10);

  // Payment methods from API
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  // Multiple payments support
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showMethodPicker, setShowMethodPicker] = useState(false);

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Validation state
  const [customerError, setCustomerError] = useState(false);

  // Customer selection modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // New customer modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState<NewCustomerForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    note: '',
  });
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // Transaction notes
  const [transactionNotes, setTransactionNotes] = useState('');

  // Custom product modal
  const [showCustomProductModal, setShowCustomProductModal] = useState(false);
  const [customProductForm, setCustomProductForm] = useState<CustomProductFormState>({
    name: '',
    cost: '',
    price: '',
    quantity: '1',
  });

  // Load payment methods on mount
  useEffect(() => {
    loadPaymentMethods();
  }, []);

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

  const loadPaymentMethods = async () => {
    setIsLoadingMethods(true);
    const methods = await getPaymentMethods();
    setPaymentMethods(methods);
    if (methods.length > 0) {
      setSelectedMethodId(methods[0].id);
    }
    setIsLoadingMethods(false);
  };

  // Debounced customer search
  const handleCustomerSearch = useCallback(async (query: string) => {
    setCustomerSearch(query);

    if (query.length < 2) {
      setCustomerResults([]);
      setShowCustomerResults(false);
      return;
    }

    setIsSearchingCustomer(true);
    setShowCustomerResults(true);

    const results = await searchCustomers(query);
    setCustomerResults(results);
    setIsSearchingCustomer(false);
  }, []);

  // Select a customer and load their details
  const handleSelectCustomer = async (customer: CustomerSearchResult) => {
    setShowCustomerResults(false);
    setCustomerSearch('');
    setIsSearchingCustomer(true);

    const details = await getCustomerDetails(customer.id);
    if (details) {
      setSelectedCustomer(details);
      setCustomerError(false); // Clear validation error
      Toast.show({
        type: 'success',
        text1: 'Customer Selected',
        text2: `${details.name} - Points: $${details.points_balance.toFixed(2)}, Credit: $${details.store_credit_balance.toFixed(2)}`,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not load customer details',
      });
    }
    setIsSearchingCustomer(false);
  };

  // Calculate tax based on toggle and slider
  const calculateTax = () => {
    if (!taxEnabled) return 0;
    return getSubtotal() * (taxRate / 100);
  };

  // Calculate total with optional tax
  const calculateTotal = () => {
    return getSubtotal() + calculateTax();
  };

  // Get payment method name by ID
  const getMethodName = (methodId: number) => {
    const method = paymentMethods.find(m => m.id === methodId);
    return method?.name || 'Unknown';
  };

  // Get selected method name
  const getSelectedMethodName = () => {
    if (!selectedMethodId) return 'Select Method';
    return getMethodName(selectedMethodId);
  };

  // Check if selected method is Points or Store Credit
  const isPointsMethod = (methodId: number) => {
    const method = paymentMethods.find(m => m.id === methodId);
    return method?.name?.toLowerCase().includes('point');
  };

  const isStoreCreditMethod = (methodId: number) => {
    const method = paymentMethods.find(m => m.id === methodId);
    const name = method?.name?.toLowerCase() || '';
    return name.includes('credit') || name.includes('store credit');
  };

  // Get already used points/credit from payments
  const getUsedPoints = () => {
    return payments
      .filter(p => isPointsMethod(p.payment_method_id))
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  };

  const getUsedStoreCredit = () => {
    return payments
      .filter(p => isStoreCreditMethod(p.payment_method_id))
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  };

  // Remove selected customer
  const handleRemoveCustomer = () => {
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setNewCustomerForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      note: '',
    });
    setCustomerSearch('');
    // Remove any Points or Store Credit payments when customer is removed
    setPayments(payments.filter(p =>
      !isPointsMethod(p.payment_method_id) && !isStoreCreditMethod(p.payment_method_id)
    ));
  };

  // Validate email format
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle save new customer
  const handleSaveNewCustomer = () => {
    // Validate required fields
    if (!newCustomerForm.first_name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'First name is required',
      });
      return;
    }
    if (!newCustomerForm.last_name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Last name is required',
      });
      return;
    }
    if (!newCustomerForm.email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Email is required',
      });
      return;
    }
    if (!isValidEmail(newCustomerForm.email)) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a valid email address',
      });
      return;
    }

    // Set as new customer (not from database)
    setIsNewCustomer(true);
    setCustomerError(false);
    setShowNewCustomerModal(false);

    Toast.show({
      type: 'success',
      text1: 'New Customer Added',
      text2: `${newCustomerForm.first_name} ${newCustomerForm.last_name}`,
    });
  };

  // Handle save custom product
  const handleSaveCustomProduct = () => {
    // Validate required fields
    if (!customProductForm.name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Product name is required',
      });
      return;
    }
    if (!customProductForm.price.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Price is required',
      });
      return;
    }

    const price = parseFloat(customProductForm.price);
    const cost = parseFloat(customProductForm.cost) || 0;
    const quantity = parseInt(customProductForm.quantity) || 1;

    if (isNaN(price) || price <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a valid price',
      });
      return;
    }

    if (quantity <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Quantity must be at least 1',
      });
      return;
    }

    // Add custom product to cart
    const customProduct: CustomProductForm = {
      name: customProductForm.name.trim(),
      cost: cost,
      price: price,
      quantity: quantity,
    };

    addCustomProduct(customProduct);

    // Reset form and close modal
    setCustomProductForm({
      name: '',
      cost: '',
      price: '',
      quantity: '1',
    });
    setShowCustomProductModal(false);

    Toast.show({
      type: 'success',
      text1: 'Product Added',
      text2: `${customProduct.name} added to cart`,
    });
  };

  // Calculate total paid
  const getTotalPaid = () => {
    return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  };

  // Calculate remaining balance
  const getRemainingBalance = () => {
    return calculateTotal() - getTotalPaid();
  };

  // Get max allowed amount for Points
  const getMaxPointsAmount = () => {
    if (!selectedCustomer) return 0;
    const availablePoints = selectedCustomer.points_balance - getUsedPoints();
    return Math.min(availablePoints, getRemainingBalance());
  };

  // Check if preset amount is disabled (for Points only)
  const isPresetDisabled = (amount: number) => {
    if (!selectedMethodId) return true;
    if (!selectedCustomer) return true;
    return amount > getMaxPointsAmount();
  };

  // Handle preset amount click
  const handlePresetAmount = (amount: number) => {
    if (isPresetDisabled(amount)) return;
    setPaymentAmount(amount.toFixed(2));
  };

  // Check if payment method is already added
  const isPaymentMethodAdded = (methodId: number) => {
    return payments.some(p => p.payment_method_id === methodId);
  };

  // Add payment entry
  const handleAddPayment = () => {
    if (!selectedMethodId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select a payment method',
      });
      return;
    }

    // Check if payment method is already added
    if (isPaymentMethodAdded(selectedMethodId)) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `${getMethodName(selectedMethodId)} is already added`,
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a valid amount',
      });
      return;
    }

    const remaining = getRemainingBalance();
    if (amount > remaining + 0.01) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Amount exceeds remaining balance ($${remaining.toFixed(2)})`,
      });
      return;
    }

    // Validate Points payment method
    if (isPointsMethod(selectedMethodId)) {
      if (!selectedCustomer) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Please select a customer to use Points',
        });
        return;
      }
      if (!selectedCustomer.allow_points) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'This customer is not allowed to use Points',
        });
        return;
      }
      const availablePoints = selectedCustomer.points_balance - getUsedPoints();
      if (amount > availablePoints) {
        Toast.show({
          type: 'error',
          text1: 'Insufficient Points',
          text2: `Available: $${availablePoints.toFixed(2)}`,
        });
        return;
      }
    }

    // Validate Store Credit payment method
    if (isStoreCreditMethod(selectedMethodId)) {
      if (!selectedCustomer) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Please select a customer to use Store Credit',
        });
        return;
      }
      if (!selectedCustomer.allow_store_credit) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'This customer is not allowed to use Store Credit',
        });
        return;
      }
      const availableCredit = selectedCustomer.store_credit_balance - getUsedStoreCredit();
      if (amount > availableCredit) {
        Toast.show({
          type: 'error',
          text1: 'Insufficient Store Credit',
          text2: `Available: $${availableCredit.toFixed(2)}`,
        });
        return;
      }
    }

    const newPayment: PaymentEntry = {
      id: Date.now().toString(),
      payment_method_id: selectedMethodId,
      amount: amount.toFixed(2),
    };

    setPayments([...payments, newPayment]);
    setPaymentAmount('');
  };

  // Remove payment entry
  const handleRemovePayment = (paymentId: string) => {
    setPayments(payments.filter(p => p.id !== paymentId));
  };

  // Fill remaining balance
  const handleFillRemaining = () => {
    const remaining = getRemainingBalance();
    if (remaining > 0) {
      setPaymentAmount(remaining.toFixed(2));
    }
  };

  // Handle complete sale
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Cart is empty',
      });
      return;
    }

    // Validate customer selection (either existing or new)
    if (!selectedCustomer && !isNewCustomer) {
      setCustomerError(true);
      Toast.show({
        type: 'error',
        text1: 'Customer Required',
        text2: 'Please select or add a customer to complete the sale',
      });
      return;
    }

    if (payments.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please add at least one payment',
      });
      return;
    }

    const remaining = getRemainingBalance();
    if (Math.abs(remaining) > 0.01) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Payment amount doesn't match total. Remaining: $${remaining.toFixed(2)}`,
      });
      return;
    }

    setIsLoading(true);

    const total = calculateTotal();
    const tax = calculateTax();
    const pointsUsed = getUsedPoints();
    const storeCreditUsed = getUsedStoreCredit();

    // Build items array - handle both regular and custom products
    const items = cartItems.map(item => {
      if (isCustomItem(item)) {
        // Custom product
        return {
          is_custom: true,
          name: item.name,
          cost: item.cost,
          price: item.price,
          quantity: item.cartQty,
        } as CustomTransactionItem;
      } else {
        // Regular product
        return {
          product_id: item.id as number,
          quantity: item.cartQty,
          price: item.price,
        };
      }
    });

    const payload: TransactionPayload = {
      items: items,
      payments: payments.map(p => ({
        payment_method_id: p.payment_method_id,
        amount: parseFloat(p.amount),
      })),
      subtotal: getSubtotal(),
      tax: tax,
      total: total,
      points_used: pointsUsed > 0 ? pointsUsed : undefined,
      store_credit_used: storeCreditUsed > 0 ? storeCreditUsed : undefined,
      notes: transactionNotes.trim() || undefined,
    };

    // Add customer data - either existing customer ID or new customer object
    if (isNewCustomer) {
      payload.new_customer = {
        first_name: newCustomerForm.first_name.trim(),
        last_name: newCustomerForm.last_name.trim(),
        email: newCustomerForm.email.trim(),
        phone: newCustomerForm.phone.trim() || null,
        note: newCustomerForm.note.trim() || null,
      };
    } else if (selectedCustomer) {
      payload.customer_id = selectedCustomer.id;
    }

    const result = await createTransaction(payload);

    setIsLoading(false);

    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Sale Complete!',
        text2: `Transaction #${result.transaction_id} completed successfully.`,
        visibilityTime: 3000,
      });
      clearCart();
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } else {
      const errorMessage = result.errors
        ? result.errors.join('\n')
        : result.message || 'Failed to complete transaction';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Header
        title="Checkout"
        showBackButton
        onBackPress={() => navigation.goBack()}
        onLogoutPress={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Customer Selection - First (Required) */}
        {/* <Text style={styles.sectionTitle}>Customer {!selectedCustomer && !isNewCustomer && <Text style={styles.requiredStar}>*</Text>}</Text> */}
        <View style={[styles.customerSection, customerError && styles.customerSectionError]}>
          {selectedCustomer ? (
            <View style={styles.selectedCustomer}>
              <View style={styles.customerHeader}>
                <Icon source="account" size={24} color={COLORS.purple} />
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>{selectedCustomer.name}</Text>
                  <Text style={styles.customerEmail}>{selectedCustomer.email}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeCustomerButton}
                  onPress={handleRemoveCustomer}>
                  <Icon source="close" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
                {/* Points Details */}
                {selectedCustomer.allow_points && (
                  <View style={styles.balanceSection}>
                    <View style={styles.balanceSectionHeader}>
                      <Icon source="star" size={16} color={COLORS.orange} />
                      <Text style={styles.balanceSectionTitle}>Points</Text>
                    </View>
                    <View style={styles.balanceGrid}>
                      <View style={styles.balanceGridItem}>
                        <Text style={styles.balanceGridLabel}>Current Balance</Text>
                        <Text style={styles.balanceGridValueHighlight}>
                          ${selectedCustomer.points_balance.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.balanceGridItem}>
                        <Text style={styles.balanceGridLabel}>Lifetime Earned</Text>
                        <Text style={styles.balanceGridValue}>
                          {selectedCustomer.lifetime_points_earned.toLocaleString()} pts
                        </Text>
                      </View>
                      <View style={styles.balanceGridItem}>
                        <Text style={styles.balanceGridLabel}>Lifetime Redeemed</Text>
                        <Text style={styles.balanceGridValue}>
                          {selectedCustomer.lifetime_points_redeemed.toLocaleString()} pts
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Store Credit Details */}
                {selectedCustomer.allow_store_credit && (
                  <View style={styles.balanceSection}>
                    <View style={styles.balanceSectionHeader}>
                      <Icon source="wallet" size={16} color={COLORS.green} />
                      <Text style={styles.balanceSectionTitle}>Store Credit</Text>
                    </View>
                    <View style={styles.balanceGrid}>
                      <View style={styles.balanceGridItem}>
                        <Text style={styles.balanceGridLabel}>Current Balance</Text>
                        <Text style={styles.balanceGridValueHighlight}>
                          ${selectedCustomer.store_credit_balance.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.balanceGridItem}>
                        <Text style={styles.balanceGridLabel}>Lifetime Earned</Text>
                        <Text style={styles.balanceGridValue}>
                          ${selectedCustomer.lifetime_store_credit_earned.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.balanceGridItem}>
                        <Text style={styles.balanceGridLabel}>Lifetime Used</Text>
                        <Text style={styles.balanceGridValue}>
                          ${selectedCustomer.lifetime_store_credit_used.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
            </View>
          ) : isNewCustomer ? (
            // New Customer Display
            <View style={styles.selectedCustomer}>
              <View style={styles.customerHeader}>
                <View style={styles.newCustomerBadge}>
                  <Icon source="account-plus" size={20} color={COLORS.green} />
                </View>
                <View style={styles.customerDetails}>
                  <View style={styles.newCustomerNameRow}>
                    <Text style={styles.customerName}>
                      {newCustomerForm.first_name} {newCustomerForm.last_name}
                    </Text>
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  </View>
                  <Text style={styles.customerEmail}>{newCustomerForm.email}</Text>
                  {newCustomerForm.phone && (
                    <Text style={styles.customerPhone}>{newCustomerForm.phone}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removeCustomerButton}
                  onPress={handleRemoveCustomer}>
                  <Icon source="close" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
              {newCustomerForm.note && (
                <View style={styles.customerNoteSection}>
                  <Icon source="note-text" size={14} color={COLORS.textMuted} />
                  <Text style={styles.customerNoteText}>{newCustomerForm.note}</Text>
                </View>
              )}
              <View style={styles.newCustomerInfo}>
                <Icon source="information-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.newCustomerInfoText}>
                  New customer - Points and Store Credit not available
                </Text>
              </View>
            </View>
          ) : (
            // Select Customer Card Button
            <TouchableOpacity
              style={styles.selectCustomerCard}
              onPress={() => setShowCustomerModal(true)}
              activeOpacity={0.8}>
              <View style={styles.selectCustomerIcon}>
                <Icon source="account-group" size={28} color={COLORS.white} />
              </View>
              <View style={styles.selectCustomerContent}>
                <Text style={styles.selectCustomerTitle}>Select Customer</Text>
                <Text style={styles.selectCustomerSubtitle}>
                  Choose customer for sale
                </Text>
              </View>
              <Icon source="chevron-right" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* Add Custom Product */}
        <TouchableOpacity
          style={styles.addCustomProductCard}
          onPress={() => setShowCustomProductModal(true)}
          activeOpacity={0.8}>
          <View style={styles.addCustomProductIcon}>
            <Icon source="plus-box" size={28} color={COLORS.warningBg} />
          </View>
          <View style={styles.addCustomProductContent}>
            <Text style={styles.addCustomProductTitle}>Add Custom Product</Text>
            <Text style={styles.addCustomProductSubtitle}>Create a one-time product</Text>
          </View>
          <Icon source="chevron-right" size={24} color={COLORS.white} />
        </TouchableOpacity>

        {/* Order Summary */}
        <View style={styles.orderSummaryHeader}>
          <View style={styles.orderSummaryHeaderLeft}>
            <Icon source="clipboard-list" size={20} color={COLORS.purple} />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>
          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText}>
              {cartItems.reduce((sum, item) => sum + item.cartQty, 0)} items
            </Text>
          </View>
        </View>

        {/* Product Items */}
        <View style={styles.orderItemsContainer}>
          {cartItems.map(item => {
            const isCustom = isCustomItem(item);
            const remainingStock = isCustom ? 999 : (item as any).quantity - item.cartQty;
            const isMaxStock = isCustom ? false : !canAddMore(item.id as number, (item as any).quantity);

            return (
              <View key={item.id} style={styles.orderItemCard}>
                {/* Product Icon */}
                <View style={[styles.orderItemIcon, isCustom && styles.orderItemIconCustom]}>
                  <Icon
                    source={isCustom ? 'plus-box' : 'package-variant'}
                    size={20}
                    color={isCustom ? COLORS.orange : COLORS.purple}
                  />
                </View>

                {/* Product Info */}
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.orderItemPrice}>
                    ${item.price.toFixed(2)} each
                  </Text>
                  {isCustom ? (
                    <View style={styles.customProductBadge}>
                      <Icon source="plus-box" size={10} color={COLORS.orange} />
                      <Text style={styles.customProductBadgeText}>Custom Product</Text>
                    </View>
                  ) : (
                    <View style={[
                      styles.orderItemStockBadge,
                      isMaxStock && styles.orderItemStockBadgeWarning,
                    ]}>
                      <Icon
                        source={isMaxStock ? 'alert-circle' : 'package-variant'}
                        size={10}
                        color={isMaxStock ? COLORS.orange : COLORS.green}
                      />
                      <Text style={[
                        styles.orderItemStockText,
                        isMaxStock && styles.orderItemStockTextWarning,
                      ]}>
                        {isMaxStock ? 'Max reached' : `${remainingStock} in stock`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Quantity Controls */}
                <View style={styles.orderItemControls}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      if (item.cartQty > 1) {
                        updateQuantity(item.id, item.cartQty - 1);
                      } else {
                        removeFromCart(item.id);
                      }
                    }}>
                    <Icon
                      source={item.cartQty === 1 ? 'trash-can-outline' : 'minus'}
                      size={16}
                      color={item.cartQty === 1 ? COLORS.danger : COLORS.white}
                    />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.cartQty}</Text>
                  <TouchableOpacity
                    style={[
                      styles.qtyBtn,
                      styles.qtyBtnPlus,
                      isMaxStock && styles.qtyBtnDisabled,
                    ]}
                    onPress={() => {
                      if (isMaxStock) {
                        Toast.show({
                          type: 'info',
                          text1: 'Stock Limit',
                          text2: `Only ${(item as any).quantity} available in stock`,
                        });
                      } else {
                        updateQuantity(item.id, item.cartQty + 1);
                      }
                    }}>
                    <Icon source="plus" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                {/* Item Total */}
                <Text style={styles.orderItemTotal}>
                  ${(item.price * item.cartQty).toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Calculations Card */}
        <View style={styles.calculationsCard}>
          {/* Subtotal */}
          <View style={styles.calcRow}>
            <View style={styles.calcLabelRow}>
              <Icon source="receipt" size={16} color={COLORS.textSecondary} />
              <Text style={styles.calcLabel}>Subtotal</Text>
            </View>
            <Text style={styles.calcValue}>${getSubtotal().toFixed(2)}</Text>
          </View>
        </View>

        {/* Tax Settings - Inline */}
        <View style={styles.taxSettingsInline}>
          <TouchableOpacity
            style={styles.taxToggleInline}
            onPress={() => setTaxEnabled(!taxEnabled)}
            activeOpacity={0.7}>
            <View style={styles.taxToggleLeft}>
              <View style={[styles.taxIconContainer, taxEnabled && styles.taxIconContainerActive]}>
                <Icon source="percent" size={18} color={taxEnabled ? COLORS.orange : COLORS.textMuted} />
              </View>
              <View>
                <Text style={styles.taxToggleTitle}>Sales Tax</Text>
                <Text style={styles.taxToggleSubtitle}>
                  {taxEnabled ? `${taxRate}% applied` : 'Tap to enable'}
                </Text>
              </View>
            </View>
            <View style={styles.taxToggleRight}>
              {taxEnabled && (
                <Text style={styles.taxAmountPreview}>+${calculateTax().toFixed(2)}</Text>
              )}
              <View style={[styles.taxToggleSwitch, taxEnabled && styles.taxToggleSwitchActive]}>
                <View style={[styles.taxToggleKnob, taxEnabled && styles.taxToggleKnobActive]} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Tax Rate Selector */}
          {taxEnabled && (
            <View style={styles.taxRateSelector}>
              {/* Fine-tune Adjustment */}
              <View style={styles.taxAdjustContainerFirst}>
                <Text style={styles.taxAdjustLabel}>Fine-tune</Text>
                <View style={styles.taxAdjustRow}>
                  {/* Decrease buttons */}
                  <TouchableOpacity
                    style={[styles.taxAdjustBtn, taxRate <= 0 && styles.taxAdjustBtnDisabled]}
                    onPress={() => setTaxRate(Math.max(0, taxRate - 5))}
                    disabled={taxRate <= 0}>
                    <Text style={[styles.taxAdjustBtnText, taxRate <= 0 && styles.taxAdjustBtnTextDisabled]}>-5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.taxAdjustBtn, taxRate <= 0 && styles.taxAdjustBtnDisabled]}
                    onPress={() => setTaxRate(Math.max(0, taxRate - 1))}
                    disabled={taxRate <= 0}>
                    <Text style={[styles.taxAdjustBtnText, taxRate <= 0 && styles.taxAdjustBtnTextDisabled]}>-1</Text>
                  </TouchableOpacity>

                  {/* Current Value Display */}
                  <View style={styles.taxCurrentValue}>
                    <Text style={styles.taxCurrentValueText}>{taxRate}%</Text>
                  </View>

                  {/* Increase buttons */}
                  <TouchableOpacity
                    style={[styles.taxAdjustBtn, styles.taxAdjustBtnPlus, taxRate >= 100 && styles.taxAdjustBtnDisabled]}
                    onPress={() => setTaxRate(Math.min(100, taxRate + 1))}
                    disabled={taxRate >= 100}>
                    <Text style={[styles.taxAdjustBtnText, styles.taxAdjustBtnTextPlus, taxRate >= 100 && styles.taxAdjustBtnTextDisabled]}>+1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.taxAdjustBtn, styles.taxAdjustBtnPlus, taxRate >= 100 && styles.taxAdjustBtnDisabled]}
                    onPress={() => setTaxRate(Math.min(100, taxRate + 5))}
                    disabled={taxRate >= 100}>
                    <Text style={[styles.taxAdjustBtnText, styles.taxAdjustBtnTextPlus, taxRate >= 100 && styles.taxAdjustBtnTextDisabled]}>+5</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Suggested Nearby Rates */}
              {![5, 10, 15, 18, 20].includes(taxRate) && (
                <View style={styles.suggestedRatesContainer}>
                  <Text style={styles.suggestedRatesLabel}>Suggested</Text>
                  <View style={styles.suggestedRatesRow}>
                    {[
                      Math.max(0, Math.floor(taxRate / 5) * 5),
                      Math.min(100, Math.ceil(taxRate / 5) * 5),
                    ]
                      .filter((v, i, a) => a.indexOf(v) === i && v !== taxRate)
                      .slice(0, 3)
                      .map(rate => (
                        <TouchableOpacity
                          key={rate}
                          style={styles.suggestedRateBtn}
                          onPress={() => setTaxRate(rate)}>
                          <Text style={styles.suggestedRateBtnText}>{rate}%</Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </View>
              )}

              {/* Custom Rate Slider */}
              <View style={styles.customRateContainer}>
                <View style={styles.sliderLabelRow}>
                  <Text style={styles.customRateLabel}>Slider</Text>
                  <Text style={styles.sliderRangeLabel}>0% - 100%</Text>
                </View>
                <Slider
                  style={styles.taxSliderInline}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={taxRate}
                  onValueChange={setTaxRate}
                  minimumTrackTintColor={COLORS.orange}
                  maximumTrackTintColor={COLORS.inputBg}
                  thumbTintColor={COLORS.orange}
                />
              </View>
            </View>
          )}
        </View>

        {/* Total Card */}
        <View style={styles.totalCard}>
          <View style={styles.totalCardLeft}>
            <Text style={styles.totalCardLabel}>Total</Text>
            {taxEnabled && (
              <Text style={styles.totalCardSubtext}>
                Includes ${calculateTax().toFixed(2)} tax
              </Text>
            )}
          </View>
          <Text style={styles.totalCardValue}>${calculateTotal().toFixed(2)}</Text>
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.paymentSection}>
          {isLoadingMethods ? (
            <ActivityIndicator size="small" color={COLORS.purple} />
          ) : (
            <>
              {/* Add Payment Row */}
              <View style={styles.addPaymentRow}>
                {/* Method Selector */}
                <TouchableOpacity
                  style={styles.methodSelector}
                  onPress={() => setShowMethodPicker(!showMethodPicker)}>
                  <Text style={styles.methodSelectorText}>
                    {getSelectedMethodName()}
                  </Text>
                  <Icon
                    source={showMethodPicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>

                {/* Amount Input */}
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                  />
                  <TouchableOpacity
                    style={styles.fillButton}
                    onPress={handleFillRemaining}>
                    <Text style={styles.fillButtonText}>Fill</Text>
                  </TouchableOpacity>
                </View>

                {/* Add Button */}
                <TouchableOpacity
                  style={styles.addPaymentButton}
                  onPress={handleAddPayment}>
                  <Icon source="plus" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {/* Method Picker Dropdown */}
              {showMethodPicker && (
                <View style={styles.methodPicker}>
                  {paymentMethods.map(method => {
                    const isAdded = isPaymentMethodAdded(method.id);
                    return (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          styles.methodOption,
                          selectedMethodId === method.id && styles.methodOptionActive,
                          isAdded && styles.methodOptionDisabled,
                        ]}
                        onPress={() => {
                          if (!isAdded) {
                            setSelectedMethodId(method.id);
                            setShowMethodPicker(false);
                          }
                        }}
                        disabled={isAdded}>
                        <View style={styles.methodOptionContent}>
                          <Text
                            style={[
                              styles.methodOptionText,
                              selectedMethodId === method.id && styles.methodOptionTextActive,
                              isAdded && styles.methodOptionTextDisabled,
                            ]}>
                            {method.name}
                          </Text>
                          {isAdded && (
                            <Text style={styles.methodOptionAddedLabel}>Added</Text>
                          )}
                        </View>
                        {selectedMethodId === method.id && !isAdded && (
                          <Icon source="check" size={18} color={COLORS.purple} />
                        )}
                        {isAdded && (
                          <Icon source="check-circle" size={18} color={COLORS.green} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Preset Amount Buttons for Points only */}
              {selectedMethodId && isPointsMethod(selectedMethodId) && (
                <View style={styles.presetAmountsContainer}>
                  <View style={styles.presetAmountsHeader}>
                    <Icon source="star" size={16} color={COLORS.orange} />
                    <Text style={styles.presetAmountsLabel}>Use Points</Text>
                    {selectedCustomer && (
                      <Text style={styles.presetAmountsBalance}>
                        (Available: ${getMaxPointsAmount().toFixed(2)})
                      </Text>
                    )}
                  </View>
                  <View style={styles.presetAmountsRow}>
                    {PRESET_AMOUNTS.map(amount => {
                      const disabled = isPresetDisabled(amount);
                      return (
                        <TouchableOpacity
                          key={amount}
                          style={[
                            styles.presetButton,
                            disabled && styles.presetButtonDisabled,
                          ]}
                          onPress={() => handlePresetAmount(amount)}
                          disabled={disabled}>
                          <Text
                            style={[
                              styles.presetButtonText,
                              disabled && styles.presetButtonTextDisabled,
                            ]}>
                            ${amount}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {!selectedCustomer && (
                    <Text style={styles.presetWarning}>
                      Select a customer to use Points
                    </Text>
                  )}
                </View>
              )}

              {/* Added Payments List */}
              {payments.length > 0 && (
                <View style={styles.paymentsList}>
                  {payments.map(payment => (
                    <View key={payment.id} style={styles.paymentItem}>
                      <View style={styles.paymentItemInfo}>
                        <Icon
                          source="cash"
                          size={20}
                          color={COLORS.green}
                        />
                        <Text style={styles.paymentItemMethod}>
                          {getMethodName(payment.payment_method_id)}
                        </Text>
                      </View>
                      <Text style={styles.paymentItemAmount}>
                        ${payment.amount}
                      </Text>
                      <TouchableOpacity
                        style={styles.removePaymentButton}
                        onPress={() => handleRemovePayment(payment.id)}>
                        <Icon source="close" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Payment Summary */}
              <View style={styles.paymentSummary}>
                <View style={styles.paymentSummaryRow}>
                  <Text style={styles.paymentSummaryLabel}>Total Paid</Text>
                  <Text style={styles.paymentSummaryValue}>
                    ${getTotalPaid().toFixed(2)}
                  </Text>
                </View>
                <View style={styles.paymentSummaryRow}>
                  <Text style={styles.paymentSummaryLabel}>Remaining</Text>
                  <Text
                    style={[
                      styles.paymentSummaryValue,
                      getRemainingBalance() > 0.01
                        ? styles.remainingDue
                        : styles.remainingPaid,
                    ]}>
                    ${getRemainingBalance().toFixed(2)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Transaction Notes */}
        <Text style={styles.sectionTitle}>Transaction Note</Text>
        <View style={styles.notesSection}>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any notes about this transaction..."
            placeholderTextColor={COLORS.textMuted}
            value={transactionNotes}
            onChangeText={setTransactionNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Complete Sale Button */}
        <TouchableOpacity
          style={[
            styles.completeButton,
            (isLoading || Math.abs(getRemainingBalance()) > 0.01) &&
              styles.buttonDisabled,
          ]}
          onPress={handleCompleteSale}
          disabled={isLoading || Math.abs(getRemainingBalance()) > 0.01}>
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Icon source="check-circle" size={24} color={COLORS.white} />
              <Text style={styles.completeButtonText}>Complete Sale</Text>
              <Text style={styles.completeButtonTotal}>
                ${calculateTotal().toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* New Customer Modal */}
      <DraggableBottomSheet
        visible={showNewCustomerModal}
        onClose={() => setShowNewCustomerModal(false)}
        minHeight="60%"
        maxHeight="85%"
        avoidKeyboard>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <View style={styles.modalHeaderIcon}>
              <Icon source="account-plus" size={20} color={COLORS.green} />
            </View>
            <Text style={styles.modalTitle}>New Customer</Text>
          </View>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowNewCustomerModal(false)}>
            <Icon source="close" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Name Row */}
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>First Name <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder="First Name"
                placeholderTextColor={COLORS.textMuted}
                value={newCustomerForm.first_name}
                onChangeText={(v) => setNewCustomerForm({...newCustomerForm, first_name: v})}
              />
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Last Name <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder="Last Name"
                placeholderTextColor={COLORS.textMuted}
                value={newCustomerForm.last_name}
                onChangeText={(v) => setNewCustomerForm({...newCustomerForm, last_name: v})}
              />
            </View>
          </View>

          {/* Email & Phone Row */}
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Email <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder="Email"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newCustomerForm.email}
                onChangeText={(v) => setNewCustomerForm({...newCustomerForm, email: v})}
              />
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Phone Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Phone Number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={newCustomerForm.phone}
                onChangeText={(v) => setNewCustomerForm({...newCustomerForm, phone: v})}
              />
            </View>
          </View>

          {/* Customer Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Customer Notes</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              placeholder="Add notes about this customer (will be saved with customer record)"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={newCustomerForm.note}
              onChangeText={(v) => setNewCustomerForm({...newCustomerForm, note: v})}
            />
          </View>
        </ScrollView>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveCustomerButton}
          onPress={handleSaveNewCustomer}>
          <Icon source="content-save" size={20} color={COLORS.white} />
          <Text style={styles.saveCustomerButtonText}>Save Customer</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>

      {/* Customer Selection Modal */}
      <DraggableBottomSheet
        visible={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        minHeight="70%"
        maxHeight="80%"
        avoidKeyboard>
        {/* Modal Header */}
        <View style={styles.customerModalHeader}>
          <View style={styles.customerModalHeaderLeft}>
            <View style={styles.customerModalHeaderIcon}>
              <Icon source="account-group" size={20} color={COLORS.purple} />
            </View>
            <Text style={styles.customerModalHeaderTitle}>Select Customer</Text>
          </View>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowCustomerModal(false)}>
            <Icon source="close" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.customerModalSearch}>
          <View style={styles.searchInputContainer}>
            <Icon source="magnify" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, phone..."
              placeholderTextColor={COLORS.textMuted}
              value={customerSearch}
              onChangeText={handleCustomerSearch}
              autoFocus
            />
            {isSearchingCustomer && (
              <ActivityIndicator size="small" color={COLORS.purple} />
            )}
          </View>
        </View>

        {/* Search Results */}
        <ScrollView style={styles.customerModalResults} showsVerticalScrollIndicator={false}>
          {showCustomerResults && customerResults.length > 0 && (
            <View style={styles.customerResultsList}>
              {customerResults.map(customer => (
                <TouchableOpacity
                  key={customer.id}
                  style={styles.customerResultItem}
                  onPress={() => {
                    handleSelectCustomer(customer);
                    setShowCustomerModal(false);
                  }}>
                  <View style={styles.customerResultIcon}>
                    <Icon source="account" size={24} color={COLORS.purple} />
                  </View>
                  <View style={styles.customerResultInfo}>
                    <Text style={styles.customerResultName}>{customer.name}</Text>
                    <Text style={styles.customerResultEmail}>{customer.email}</Text>
                  </View>
                  <Icon source="chevron-right" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {showCustomerResults && customerResults.length === 0 && !isSearchingCustomer && customerSearch.length >= 2 && (
            <View style={styles.noResultsContainer}>
              <Icon source="account-search" size={48} color={COLORS.textMuted} />
              <Text style={styles.noResultsTitle}>No customers found</Text>
              <Text style={styles.noResultsSubtitle}>Try a different search term or add a new customer</Text>
            </View>
          )}
          {!showCustomerResults && (
            <View style={styles.searchHintContainer}>
              <Icon source="account-search" size={48} color={COLORS.textMuted} />
              <Text style={styles.searchHintText}>Search for an existing customer</Text>
              <Text style={styles.searchHintSubtext}>Enter name, email, or phone number</Text>
            </View>
          )}
        </ScrollView>

        {/* Add New Customer Button */}
        <View style={styles.customerModalFooter}>
          <TouchableOpacity
            style={styles.addNewCustomerButtonModal}
            onPress={() => {
              setShowCustomerModal(false);
              setShowNewCustomerModal(true);
            }}>
            <Icon source="plus" size={20} color={COLORS.white} />
            <Text style={styles.addNewCustomerText}>Add New Customer</Text>
          </TouchableOpacity>
        </View>
      </DraggableBottomSheet>

      {/* Custom Product Modal */}
      <DraggableBottomSheet
        visible={showCustomProductModal}
        onClose={() => setShowCustomProductModal(false)}
        minHeight="55%"
        maxHeight="75%"
        avoidKeyboard>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <View style={[styles.modalHeaderIcon, styles.modalHeaderIconOrange]}>
              <Icon source="plus-box" size={20} color={COLORS.orange} />
            </View>
            <Text style={styles.modalTitle}>Custom Product</Text>
          </View>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowCustomProductModal(false)}>
            <Icon source="close" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Product Name */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Product Name <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={styles.formInput}
              placeholder="Enter product name"
              placeholderTextColor={COLORS.textMuted}
              value={customProductForm.name}
              onChangeText={(v) => setCustomProductForm({...customProductForm, name: v})}
            />
          </View>

          {/* Cost & Price Row */}
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Cost</Text>
              <View style={styles.currencyInputContainer}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={styles.currencyInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  value={customProductForm.cost}
                  onChangeText={(v) => setCustomProductForm({...customProductForm, cost: v})}
                />
              </View>
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Price <Text style={styles.requiredStar}>*</Text></Text>
              <View style={styles.currencyInputContainer}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={styles.currencyInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  value={customProductForm.price}
                  onChangeText={(v) => setCustomProductForm({...customProductForm, price: v})}
                />
              </View>
            </View>
          </View>

          {/* Quantity */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Quantity</Text>
            <View style={styles.quantityInputRow}>
              <TouchableOpacity
                style={styles.quantityInputBtn}
                onPress={() => {
                  const qty = Math.max(1, parseInt(customProductForm.quantity) - 1 || 1);
                  setCustomProductForm({...customProductForm, quantity: qty.toString()});
                }}>
                <Icon source="minus" size={18} color={COLORS.white} />
              </TouchableOpacity>
              <TextInput
                style={styles.quantityInputField}
                placeholder="1"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                value={customProductForm.quantity}
                onChangeText={(v) => setCustomProductForm({...customProductForm, quantity: v})}
              />
              <TouchableOpacity
                style={[styles.quantityInputBtn, styles.quantityInputBtnPlus]}
                onPress={() => {
                  const qty = (parseInt(customProductForm.quantity) || 0) + 1;
                  setCustomProductForm({...customProductForm, quantity: qty.toString()});
                }}>
                <Icon source="plus" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Preview */}
          {customProductForm.name && customProductForm.price && (
            <View style={styles.customProductPreview}>
              <View style={styles.previewHeader}>
                <Icon source="eye" size={16} color={COLORS.textSecondary} />
                <Text style={styles.previewTitle}>Preview</Text>
              </View>
              <View style={styles.previewContent}>
                <Text style={styles.previewName}>{customProductForm.name}</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Price:</Text>
                  <Text style={styles.previewValue}>${parseFloat(customProductForm.price || '0').toFixed(2)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Qty:</Text>
                  <Text style={styles.previewValue}>{customProductForm.quantity || '1'}</Text>
                </View>
                <View style={[styles.previewRow, styles.previewRowTotal]}>
                  <Text style={styles.previewLabelTotal}>Total:</Text>
                  <Text style={styles.previewValueTotal}>
                    ${(parseFloat(customProductForm.price || '0') * (parseInt(customProductForm.quantity) || 1)).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveCustomProductButton}
          onPress={handleSaveCustomProduct}>
          <Icon source="plus-circle" size={20} color={COLORS.white} />
          <Text style={styles.saveCustomProductButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </DraggableBottomSheet>
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
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  requiredStar: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  // Order Summary Header
  orderSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  orderSummaryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  itemCountBadge: {
    backgroundColor: COLORS.purple + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.purple,
  },
  // Order Items Container
  orderItemsContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  orderItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  orderItemIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardBgPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
    flex: 1,
    flexShrink: 1,
  },
  orderItemPrice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderItemStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.green + '15',
    alignSelf: 'flex-start',
  },
  orderItemStockBadgeWarning: {
    backgroundColor: COLORS.orange + '15',
  },
  orderItemStockText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.green,
  },
  orderItemStockTextWarning: {
    color: COLORS.orange,
  },
  orderItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.sm,
    padding: 2,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnPlus: {
    backgroundColor: COLORS.purple,
  },
  qtyBtnDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.5,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    minWidth: 28,
    textAlign: 'center',
  },
  orderItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green,
    minWidth: 60,
    textAlign: 'right',
  },
  // Calculations Card
  calculationsCard: {
    backgroundColor: COLORS.cardBgPurple,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  calcLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  calcLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  calcValue: {
    fontSize: 14,
    color: COLORS.white,
  },
  // Total Card
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.orangeGlow,
  },
  totalCardLeft: {
    flex: 1,
  },
  totalCardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  totalCardSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  totalCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Inline Tax Settings Styles
  taxSettingsInline: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  taxToggleInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  taxToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  taxIconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taxIconContainerActive: {
    backgroundColor: COLORS.orange + '20',
  },
  taxToggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  taxToggleSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  taxToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  taxAmountPreview: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.orange,
  },
  taxToggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
    padding: 2,
    justifyContent: 'center',
  },
  taxToggleSwitchActive: {
    backgroundColor: COLORS.orange,
  },
  taxToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.textMuted,
  },
  taxToggleKnobActive: {
    backgroundColor: COLORS.white,
    alignSelf: 'flex-end',
  },
  taxRateSelector: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  // Tax Adjustment Controls
  taxAdjustContainerFirst: {
    // No border/margin when it's the first element
  },
  taxAdjustContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  taxAdjustLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  taxAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  taxAdjustBtn: {
    width: 44,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taxAdjustBtnPlus: {
    backgroundColor: COLORS.orange + '20',
  },
  taxAdjustBtnDisabled: {
    opacity: 0.4,
  },
  taxAdjustBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  taxAdjustBtnTextPlus: {
    color: COLORS.orange,
  },
  taxAdjustBtnTextDisabled: {
    color: COLORS.textMuted,
  },
  taxCurrentValue: {
    minWidth: 70,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.sm,
  },
  taxCurrentValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Suggested Rates
  suggestedRatesContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  suggestedRatesLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  suggestedRatesRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  suggestedRateBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.purple + '20',
    borderWidth: 1,
    borderColor: COLORS.purple,
  },
  suggestedRateBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.purple,
  },
  // Custom Slider
  customRateContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  customRateLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sliderRangeLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  taxSliderInline: {
    width: '100%',
    height: 28,
  },
  paymentSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: SPACING.md,
  },
  addPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  methodSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  methodSelectorText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  amountInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
  },
  currencySymbol: {
    fontSize: 16,
    color: COLORS.green,
    fontWeight: '600',
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  fillButton: {
    backgroundColor: COLORS.purple + '30',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  fillButtonText: {
    fontSize: 12,
    color: COLORS.purple,
    fontWeight: '600',
  },
  addPaymentButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodPicker: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  methodOptionActive: {
    backgroundColor: COLORS.purple + '20',
  },
  methodOptionDisabled: {
    backgroundColor: COLORS.inputBg,
    opacity: 0.7,
  },
  methodOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  methodOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  methodOptionTextActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  methodOptionTextDisabled: {
    color: COLORS.textMuted,
  },
  methodOptionAddedLabel: {
    fontSize: 10,
    color: COLORS.green,
    backgroundColor: COLORS.green + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  paymentsList: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  paymentItemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  paymentItemMethod: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  paymentItemAmount: {
    fontSize: 16,
    color: COLORS.green,
    fontWeight: '700',
    marginRight: SPACING.md,
  },
  removePaymentButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentSummary: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  paymentSummaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  paymentSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  remainingDue: {
    color: COLORS.orange,
  },
  remainingPaid: {
    color: COLORS.green,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  completeButtonTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  bottomSpacer: {
    height: 100,
  },
  // Customer section styles
  customerSection: {
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  customerSectionError: {
    borderColor: COLORS.danger,
  },
  selectedCustomer: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  customerEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  balanceSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  balanceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  balanceSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  balanceGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    padding: SPACING.sm,
  },
  balanceGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceGridLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  balanceGridValue: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  balanceGridValueHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.green,
    textAlign: 'center',
  },
  removeCustomerButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerSearchContainer: {
    gap: SPACING.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.white,
    paddingVertical: SPACING.md,
  },
  customerResults: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    overflow: 'hidden',
  },
  customerResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
    ...SHADOWS.small,
  },
  customerResultInfo: {
    flex: 1,
  },
  customerResultName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  customerResultEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noResults: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  // Preset amount buttons styles
  presetAmountsContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  presetAmountsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  presetAmountsLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.white,
  },
  presetAmountsBalance: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  presetAmountsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  presetButton: {
    flex: 1,
    backgroundColor: COLORS.purple + '20',
    borderRadius: 10,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.purple,
  },
  presetButtonDisabled: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.border,
  },
  presetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.purple,
  },
  presetButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  presetWarning: {
    fontSize: 12,
    color: COLORS.orange,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  // New Customer styles
  newCustomerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.green + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCustomerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  newBadge: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  customerPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customerNoteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  customerNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  newCustomerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  newCustomerInfoText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  addNewCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderRadius: 10,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  addNewCustomerText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Transaction Notes styles
  notesSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: SPACING.md,
  },
  notesInput: {
    fontSize: 14,
    color: COLORS.white,
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    padding: SPACING.md,
    minHeight: 80,
  },
  // Modal styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modalHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.green + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalContent: {
    padding: SPACING.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  formHalf: {
    flex: 1,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  formInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: COLORS.white,
  },
  formTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
    ...SHADOWS.greenGlow,
  },
  saveCustomerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Select Customer Card styles
  selectCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.greenGlow,
  },
  selectCustomerIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCustomerContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  selectCustomerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  selectCustomerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  // Customer Selection Modal styles
  customerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  customerModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  customerModalHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerModalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  customerModalSearch: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  customerModalResults: {
    flex: 1,
    padding: SPACING.md,
  },
  customerResultsList: {
    gap: SPACING.sm,
  },
  customerResultIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  noResultsSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  searchHintContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  searchHintText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  searchHintSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  customerModalFooter: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addNewCustomerButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    ...SHADOWS.greenGlow,
  },
  // Custom Product Styles
  orderItemIconCustom: {
    backgroundColor: COLORS.orange + '20',
  },
  customProductBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.orange + '15',
    alignSelf: 'flex-start',
  },
  customProductBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.orange,
  },
  addCustomProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  addCustomProductIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCustomProductContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  addCustomProductTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  addCustomProductSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  // Custom Product Modal Styles
  modalHeaderIconOrange: {
    backgroundColor: COLORS.orange + '20',
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.green,
    marginRight: SPACING.xs,
  },
  currencyInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.white,
    paddingVertical: SPACING.md,
  },
  quantityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  quantityInputBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInputBtnPlus: {
    backgroundColor: COLORS.orange,
  },
  quantityInputField: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingVertical: SPACING.md,
  },
  customProductPreview: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  previewTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  previewContent: {
    gap: SPACING.xs,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewRowTotal: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  previewLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  previewValue: {
    fontSize: 13,
    color: COLORS.white,
  },
  previewLabelTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  previewValueTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.green,
  },
  saveCustomProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
    ...SHADOWS.orangeGlow,
  },
  saveCustomProductButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default CheckoutScreen;
