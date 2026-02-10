import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {COLORS, SPACING, RADIUS} from '@constants/theme';
import {BuyWizardStackParamList} from '@types';
import {useBuyWizard, LocalPayment} from '@contexts/BuyWizardContext';
import {StepIndicator, WizardFooter} from '@components/buy-wizard';
import {getBuyPaymentMethods, PaymentMethod} from '@services/paymentService';
import DraggableBottomSheet from '@components/DraggableBottomSheet';

type NavigationProp = NativeStackNavigationProp<BuyWizardStackParamList, 'Step2Payment'>;

const STEP_LABELS = ['Customer', 'Payment', 'Items', 'Review', 'Complete'];

const Step2PaymentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    state,
    dispatch,
    totalSellValue,
    totalBuyAmount,
    profit,
    totalPayments,
    remainingAmount,
  } = useBuyWizard();

  // Payment methods from API
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  // Payment modal state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number>(1);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Load payment methods on mount
  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    setIsLoadingMethods(true);
    const methods = await getBuyPaymentMethods();
    setPaymentMethods(methods);
    if (methods.length > 0) {
      setSelectedPaymentMethodId(methods[0].id);
    }
    setIsLoadingMethods(false);
  };

  // Check if a payment method is already added
  const isPaymentMethodAdded = (methodId: number) => {
    return state.payments.some(p => p.payment_method_id === methodId);
  };

  // Get the first available (not added) payment method
  const getFirstAvailableMethod = () => {
    const available = paymentMethods.find(m => !isPaymentMethodAdded(m.id));
    return available?.id || paymentMethods[0]?.id || 1;
  };

  // Open payment modal with remaining amount pre-filled
  const openPaymentModal = () => {
    setPaymentAmount(remainingAmount > 0 ? remainingAmount.toFixed(2) : '');
    // Select the first available payment method that hasn't been added yet
    setSelectedPaymentMethodId(getFirstAvailableMethod());
    setPaymentModalVisible(true);
  };

  // Close payment modal
  const closePaymentModal = () => {
    setPaymentModalVisible(false);
    setPaymentAmount('');
    // Reset to first available payment method
    setSelectedPaymentMethodId(getFirstAvailableMethod());
  };

  // Add payment
  const handleAddPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Toast.show({type: 'error', text1: 'Please enter a valid amount'});
      return;
    }

    const method = paymentMethods.find(m => m.id === selectedPaymentMethodId);
    if (!method) {
      Toast.show({type: 'error', text1: 'Please select a payment method'});
      return;
    }

    const newPayment: LocalPayment = {
      localId: `payment_${Date.now()}`,
      payment_method_id: method.id,
      payment_method_name: method.name,
      amount: amount,
    };

    dispatch({type: 'ADD_PAYMENT', payload: newPayment});
    closePaymentModal();
    Toast.show({type: 'success', text1: 'Payment added'});
  };

  // Remove payment
  const removePayment = (localId: string) => {
    dispatch({type: 'REMOVE_PAYMENT', payload: localId});
  };

  // Navigation
  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    if (state.payments.length === 0) {
      Toast.show({type: 'error', text1: 'Please add at least one payment method'});
      return;
    }
    navigation.navigate('Step3Items');
  };

  // Check if can proceed
  const hasPayments = state.payments.length > 0;

  // Get payment method icon
  const getPaymentIcon = (methodName: string): string => {
    const name = methodName.toLowerCase();
    if (name.includes('cash')) return 'cash';
    if (name.includes('credit') || name.includes('card')) return 'credit-card';
    if (name.includes('paypal')) return 'alpha-p-box';
    if (name.includes('venmo')) return 'alpha-v-box';
    if (name.includes('zelle')) return 'alpha-z-box';
    if (name.includes('check')) return 'checkbook';
    if (name.includes('store') || name.includes('credit')) return 'store';
    return 'credit-card-outline';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleBack}>
          <Icon source="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Step Indicator */}
      <StepIndicator currentStep={2} totalSteps={5} labels={STEP_LABELS} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Transaction Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Transaction Summary</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryColumn}>
              <Text style={styles.summaryLabel}>Total Sell Value</Text>
              <Text style={styles.summaryValueGreen}>${totalSellValue.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryColumn}>
              <Text style={styles.summaryLabel}>Total Buy Amount</Text>
              <Text style={styles.summaryValueDark}>${totalBuyAmount.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryColumn}>
              <Text style={styles.summaryLabel}>Expected Profit</Text>
              <Text style={[styles.summaryValueLarge, {color: profit >= 0 ? COLORS.green : COLORS.danger}]}>
                ${profit.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryColumn}>
              <Text style={[styles.summaryLabel, remainingAmount > 0.01 && {color: COLORS.orange}]}>
                {remainingAmount > 0.01 ? 'Remaining' : 'Balance'}
              </Text>
              <Text style={[
                styles.summaryValueLarge,
                {color: remainingAmount > 0.01 ? COLORS.orange : COLORS.green}
              ]}>
                ${Math.abs(remainingAmount).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentSectionHeader}>
            <View style={styles.paymentTitleRow}>
              <Text style={styles.paymentSectionTitle}>Payment Methods</Text>
              {state.payments.length > 0 && (
                <View style={styles.paymentBadge}>
                  <Text style={styles.paymentBadgeText}>{state.payments.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.addPaymentButton}
              onPress={openPaymentModal}>
              <Icon source="plus" size={16} color={COLORS.white} />
              <Text style={styles.addPaymentButtonText}>Add Payment</Text>
            </TouchableOpacity>
          </View>

          {/* Payment List */}
          {state.payments.map(payment => (
            <View key={payment.localId} style={styles.paymentItemCard}>
              <View style={styles.paymentItemIcon}>
                <Icon
                  source={getPaymentIcon(payment.payment_method_name || '')}
                  size={20}
                  color={COLORS.purple}
                />
              </View>
              <View style={styles.paymentItemDetails}>
                <Text style={styles.paymentItemMethod}>{payment.payment_method_name}</Text>
              </View>
              <Text style={styles.paymentItemAmount}>${payment.amount.toFixed(2)}</Text>
              <TouchableOpacity
                style={styles.paymentItemRemove}
                onPress={() => removePayment(payment.localId)}>
                <Icon source="close" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Empty State */}
          {state.payments.length === 0 && (
            <View style={styles.emptyPaymentContainer}>
              <Icon source="credit-card-off-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyPaymentTitle}>No payments added</Text>
              <Text style={styles.emptyPaymentSubtitle}>
                Add payment methods to record how the customer was paid
              </Text>
            </View>
          )}

          {/* Totals */}
          {state.payments.length > 0 && (
            <View style={styles.paymentTotals}>
              <View style={styles.paymentTotalRow}>
                <Text style={styles.paymentTotalLabel}>Total Payments</Text>
                <Text style={styles.paymentTotalValue}>${totalPayments.toFixed(2)}</Text>
              </View>
              {remainingAmount > 0.01 && (
                <View style={styles.paymentTotalRow}>
                  <Text style={[styles.paymentTotalLabel, {color: COLORS.orange}]}>
                    Remaining to Pay
                  </Text>
                  <Text style={[styles.paymentTotalValue, {color: COLORS.orange}]}>
                    ${remainingAmount.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Quick Pay Button */}
        {remainingAmount > 0.01 && (
          <TouchableOpacity style={styles.quickPayButton} onPress={openPaymentModal}>
            <Icon source="flash" size={20} color={COLORS.white} />
            <Text style={styles.quickPayButtonText}>
              Quick Pay Remaining ${remainingAmount.toFixed(2)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Footer */}
        <WizardFooter
          onBack={handleBack}
          onNext={handleNext}
          isNextDisabled={!hasPayments}
        />
      </ScrollView>

      {/* Add Payment Modal */}
      <DraggableBottomSheet
        visible={paymentModalVisible}
        onClose={closePaymentModal}
        title="Add Payment">
        {isLoadingMethods ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.purple} />
          </View>
        ) : (
          <View style={styles.modalContent}>
            {/* Payment Method Selection */}
            <Text style={styles.modalLabel}>Payment Method</Text>
            <View style={styles.paymentMethodGrid}>
              {paymentMethods.map(method => {
                const isAdded = isPaymentMethodAdded(method.id);
                const isSelected = selectedPaymentMethodId === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodOption,
                      isSelected && !isAdded && styles.paymentMethodOptionActive,
                      isAdded && styles.paymentMethodOptionAdded,
                    ]}
                    onPress={() => !isAdded && setSelectedPaymentMethodId(method.id)}
                    disabled={isAdded}
                    activeOpacity={isAdded ? 1 : 0.7}>
                    <Icon
                      source={getPaymentIcon(method.name)}
                      size={24}
                      color={isAdded ? COLORS.textMuted : (isSelected ? COLORS.purple : COLORS.textSecondary)}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        isSelected && !isAdded && styles.paymentMethodTextActive,
                        isAdded && styles.paymentMethodTextAdded,
                      ]}>
                      {method.name}
                    </Text>
                    {isAdded && (
                      <View style={styles.addedBadge}>
                        <Icon source="check" size={10} color={COLORS.white} />
                        <Text style={styles.addedBadgeText}>Added</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Amount Input */}
            <Text style={styles.modalLabel}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            {/* Quick Amount Buttons */}
            {remainingAmount > 0 && (
              <View style={styles.quickAmountRow}>
                <TouchableOpacity
                  style={styles.quickAmountButton}
                  onPress={() => setPaymentAmount(remainingAmount.toFixed(2))}>
                  <Text style={styles.quickAmountText}>Remaining (${remainingAmount.toFixed(2)})</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickAmountButton}
                  onPress={() => setPaymentAmount(totalBuyAmount.toFixed(2))}>
                  <Text style={styles.quickAmountText}>Full (${totalBuyAmount.toFixed(2)})</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Add Button */}
            <TouchableOpacity style={styles.addButton} onPress={handleAddPayment}>
              <Icon source="plus" size={20} color={COLORS.white} />
              <Text style={styles.addButtonText}>Add Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </DraggableBottomSheet>
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
    paddingVertical: SPACING.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryColumn: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  summaryValueGreen: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.green,
  },
  summaryValueDark: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryValueLarge: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  // Payment Section
  paymentSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  paymentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  paymentSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  paymentBadge: {
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  addPaymentButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.white,
  },
  // Payment Items
  paymentItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  paymentItemIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  paymentItemDetails: {
    flex: 1,
  },
  paymentItemMethod: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  paymentItemAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.green,
    marginRight: SPACING.sm,
  },
  paymentItemRemove: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.danger + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Empty State
  emptyPaymentContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyPaymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyPaymentSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.lg,
  },
  // Payment Totals
  paymentTotals: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  paymentTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  paymentTotalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  paymentTotalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.green,
  },
  // Quick Pay Button
  quickPayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  quickPayButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Modal
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  modalContent: {
    padding: SPACING.md,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  paymentMethodOption: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  paymentMethodOptionActive: {
    borderColor: COLORS.purple,
    backgroundColor: COLORS.purple + '20',
  },
  paymentMethodOptionAdded: {
    borderColor: COLORS.green + '50',
    backgroundColor: COLORS.green + '10',
    opacity: 0.7,
  },
  paymentMethodText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  paymentMethodTextActive: {
    color: COLORS.purple,
    fontWeight: '500',
  },
  paymentMethodTextAdded: {
    color: COLORS.textMuted,
  },
  addedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 2,
  },
  addedBadgeText: {
    fontSize: 9,
    color: COLORS.white,
    fontWeight: '700',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.green,
    marginRight: SPACING.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.white,
    paddingVertical: SPACING.md,
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickAmountText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default Step2PaymentScreen;
