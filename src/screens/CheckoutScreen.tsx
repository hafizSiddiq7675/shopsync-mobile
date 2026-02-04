import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Toast from 'react-native-toast-message';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import {Icon} from 'react-native-paper';
import {SaleStackParamList} from '@types';
import {COLORS, SPACING} from '@constants/theme';
import {useCart} from '../context/CartContext';
import {createTransaction, TransactionPayload} from '@services/productService';
import {getPaymentMethods, PaymentMethod} from '@services/paymentService';

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

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const {cartItems, getSubtotal, clearCart} = useCart();
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

  // Load payment methods on mount
  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    setIsLoadingMethods(true);
    const methods = await getPaymentMethods();
    setPaymentMethods(methods);
    if (methods.length > 0) {
      setSelectedMethodId(methods[0].id);
    }
    setIsLoadingMethods(false);
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

  // Calculate total paid
  const getTotalPaid = () => {
    return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  };

  // Calculate remaining balance
  const getRemainingBalance = () => {
    return calculateTotal() - getTotalPaid();
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

    const payload: TransactionPayload = {
      items: cartItems.map(item => ({
        product_id: item.id,
        quantity: item.cartQty,
        price: item.price,
      })),
      payments: payments.map(p => ({
        payment_method_id: p.payment_method_id,
        amount: parseFloat(p.amount),
      })),
      customer_id: null,
      subtotal: getSubtotal(),
      tax: tax,
      total: total,
      notes: 'Mobile app sale',
    };

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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon source="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.orderSummary}>
          {cartItems.map(item => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.orderItemLeft}>
                <Text style={styles.orderItemName}>{item.name}</Text>
                <Text style={styles.orderItemQty}>
                  ${item.price.toFixed(2)} x {item.cartQty}
                </Text>
              </View>
              <Text style={styles.orderItemPrice}>
                ${(item.price * item.cartQty).toFixed(2)}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          {/* Subtotal */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${getSubtotal().toFixed(2)}</Text>
          </View>

          {/* Tax */}
          {taxEnabled && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax ({taxRate}%)</Text>
              <Text style={styles.summaryValue}>${calculateTax().toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Total */}
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${calculateTotal().toFixed(2)}</Text>
          </View>
        </View>

        {/* Tax Settings */}
        <Text style={styles.sectionTitle}>Tax Settings</Text>
        <View style={styles.taxSettings}>
          <View style={styles.taxToggleRow}>
            <View style={styles.taxToggleInfo}>
              <Icon source="percent" size={20} color={COLORS.orange} />
              <Text style={styles.taxToggleLabel}>Enable Sales Tax</Text>
            </View>
            <Switch
              style={styles.taxSwitch}
              value={taxEnabled}
              onValueChange={setTaxEnabled}
              trackColor={{false: COLORS.inputBg, true: COLORS.purple + '80'}}
              thumbColor={taxEnabled ? COLORS.purple : COLORS.textMuted}
            />
          </View>

          {taxEnabled && (
            <View style={styles.taxSliderContainer}>
              <View style={styles.taxSliderHeader}>
                <Text style={styles.taxSliderLabel}>Tax Rate</Text>
                <Text style={styles.taxSliderValue}>{taxRate}%</Text>
              </View>
              <Slider
                style={styles.taxSlider}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={taxRate}
                onValueChange={setTaxRate}
                minimumTrackTintColor={COLORS.purple}
                maximumTrackTintColor={COLORS.inputBg}
                thumbTintColor={COLORS.purple}
              />
              <View style={styles.taxSliderLabels}>
                <Text style={styles.taxSliderMinMax}>0%</Text>
                <Text style={styles.taxSliderMinMax}>100%</Text>
              </View>
            </View>
          )}
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
                  {paymentMethods.map(method => (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.methodOption,
                        selectedMethodId === method.id &&
                          styles.methodOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedMethodId(method.id);
                        setShowMethodPicker(false);
                      }}>
                      <Text
                        style={[
                          styles.methodOptionText,
                          selectedMethodId === method.id &&
                            styles.methodOptionTextActive,
                        ]}>
                        {method.name}
                      </Text>
                      {selectedMethodId === method.id && (
                        <Icon source="check" size={18} color={COLORS.purple} />
                      )}
                    </TouchableOpacity>
                  ))}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  placeholder: {
    width: 40,
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
  orderSummary: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  orderItemLeft: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  orderItemQty: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    color: COLORS.white,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.green,
  },
  taxSettings: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  taxToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taxToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  taxToggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  taxSwitch: {
    transform: [{scaleX: 1.1}, {scaleY: 1.1}],
  },
  taxSliderContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  taxSliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taxSliderLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  taxSliderValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.purple,
  },
  taxSlider: {
    width: '100%',
    height: 32,
  },
  taxSliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  taxSliderMinMax: {
    fontSize: 11,
    color: COLORS.textMuted,
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
  methodOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  methodOptionTextActive: {
    color: COLORS.white,
    fontWeight: '500',
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
});

export default CheckoutScreen;
