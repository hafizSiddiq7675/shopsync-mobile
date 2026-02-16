import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, CommonActions} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {COLORS, SPACING, RADIUS} from '@constants/theme';
import {BuyWizardStackParamList} from '@types';
import {useBuyWizard} from '@contexts/BuyWizardContext';
import {StepIndicator} from '@components/buy-wizard';

type NavigationProp = NativeStackNavigationProp<BuyWizardStackParamList, 'Step4Review'>;

const STEP_LABELS = ['Customer', 'Payment', 'Items', 'Review', 'Complete'];

const Step4ReviewScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    state,
    dispatch,
    totalSellValue,
    totalBuyAmount,
    profit,
    totalPayments,
    remainingAmount,
    getItemCostBasis,
    saveAsDraft,
    saveAsPending,
    completeBuyTransaction,
  } = useBuyWizard();

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingPending, setIsSavingPending] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Get condition label
  const getConditionLabel = (condition: string): string => {
    const labels: Record<string, string> = {
      new: 'New',
      nm: 'Near Mint',
      lp: 'Lightly Played',
      mp: 'Moderately Played',
      hp: 'Heavily Played',
      dmg: 'Damaged',
    };
    return labels[condition] || condition;
  };

  // Handle Save as Draft
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    const success = await saveAsDraft();
    setIsSavingDraft(false);

    if (success) {
      dispatch({type: 'RESET'});
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'BuyList' as any}],
        })
      );
    }
  };

  // Handle Save as Pending
  const handleSavePending = async () => {
    // Validate customer for pending
    if (!state.customer && !state.newCustomer) {
      Toast.show({type: 'error', text1: 'Customer is required for pending status'});
      return;
    }

    setIsSavingPending(true);
    const success = await saveAsPending();
    setIsSavingPending(false);

    if (success) {
      dispatch({type: 'RESET'});
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'BuyList' as any}],
        })
      );
    }
  };

  // Handle Complete Buy
  const handleComplete = async () => {
    // Full validation
    if (!state.customer && !state.newCustomer) {
      Toast.show({type: 'error', text1: 'Customer is required'});
      return;
    }
    if (state.items.length === 0) {
      Toast.show({type: 'error', text1: 'At least one item is required'});
      return;
    }
    if (totalBuyAmount > 0 && state.payments.length === 0) {
      Toast.show({type: 'error', text1: 'At least one payment is required'});
      return;
    }

    setIsCompleting(true);
    const success = await completeBuyTransaction();
    setIsCompleting(false);

    if (success) {
      navigation.navigate('Step5Complete');
    }
  };

  // Navigation
  const handleBack = () => {
    navigation.goBack();
  };

  const isAnyLoading = isSavingDraft || isSavingPending || isCompleting;

  // Edit handlers - navigate back to specific step
  const handleEditCustomer = () => {
    navigation.navigate('Step1Customer');
  };

  const handleEditItems = () => {
    navigation.navigate('Step3Items');
  };

  const handleEditPayments = () => {
    navigation.navigate('Step2Payment');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleBack}>
          <Icon source="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Step Indicator */}
      <StepIndicator currentStep={4} totalSteps={5} labels={STEP_LABELS} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Customer Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrapper}>
              <Icon source="account" size={18} color={COLORS.white} />
            </View>
            <Text style={styles.sectionTitle}>Customer</Text>
            <TouchableOpacity style={styles.editButton} onPress={handleEditCustomer}>
              <Icon source="pencil-outline" size={14} color={COLORS.purple} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {state.customer ? (
            <View style={styles.customerCard}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>
                  {(state.customer.name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{state.customer.name}</Text>
                <View style={styles.customerDetailRow}>
                  <Icon source="email-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.customerEmail}>{state.customer.email}</Text>
                </View>
                {state.customer.phone && (
                  <View style={styles.customerDetailRow}>
                    <Icon source="phone-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.customerPhone}>{state.customer.phone}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : state.newCustomer ? (
            <View style={styles.customerCard}>
              <View style={[styles.customerAvatar, styles.customerAvatarNew]}>
                <Text style={styles.customerAvatarText}>
                  {(state.newCustomer.firstName || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.customerInfo}>
                <View style={styles.customerNameRow}>
                  <Text style={styles.customerName}>
                    {state.newCustomer.firstName} {state.newCustomer.lastName}
                  </Text>
                  <View style={styles.newCustomerBadge}>
                    <Text style={styles.newCustomerBadgeText}>NEW</Text>
                  </View>
                </View>
                <View style={styles.customerDetailRow}>
                  <Icon source="email-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.customerEmail}>{state.newCustomer.email}</Text>
                </View>
                {state.newCustomer.phone && (
                  <View style={styles.customerDetailRow}>
                    <Icon source="phone-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.customerPhone}>{state.newCustomer.phone}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Icon source="account-off-outline" size={24} color={COLORS.textMuted} />
              <Text style={styles.noDataText}>No customer selected</Text>
            </View>
          )}
        </View>

        {/* Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrapper, styles.sectionIconGreen]}>
              <Icon source="package-variant" size={18} color={COLORS.white} />
            </View>
            <Text style={styles.sectionTitle}>Items</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{state.items.length}</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={handleEditItems}>
              <Icon source="pencil-outline" size={14} color={COLORS.purple} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {state.items.length > 0 ? (
            <View style={styles.itemsList}>
              {state.items.map((item, index) => {
                const itemCost = getItemCostBasis(item);
                const itemTotal = itemCost * item.quantity;
                return (
                  <View key={item.localId} style={styles.itemCard}>
                    <View style={styles.itemMainRow}>
                      <View style={styles.itemQtyBadge}>
                        <Text style={styles.itemQtyText}>{item.quantity}×</Text>
                      </View>
                      <View style={styles.itemContent}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={styles.itemConditionBadge}>
                          <Text style={styles.itemConditionText}>
                            {getConditionLabel(item.condition)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.itemPriceRow}>
                      <View style={styles.itemPriceCol}>
                        <Text style={styles.itemPriceLabel}>Sell</Text>
                        <Text style={styles.itemSellPrice}>${item.sell_price.toFixed(2)}</Text>
                      </View>
                      <View style={styles.itemPriceCol}>
                        <Text style={styles.itemPriceLabel}>Cost</Text>
                        <Text style={styles.itemCostPrice}>${itemCost.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.itemPriceCol, styles.itemTotalCol]}>
                        <Text style={styles.itemPriceLabel}>Total</Text>
                        <Text style={styles.itemTotalValue}>${itemTotal.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Icon source="package-variant-closed" size={24} color={COLORS.textMuted} />
              <Text style={styles.noDataText}>No items added</Text>
            </View>
          )}
        </View>

        {/* Payments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrapper, styles.sectionIconOrange]}>
              <Icon source="credit-card" size={18} color={COLORS.white} />
            </View>
            <Text style={styles.sectionTitle}>Payments</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{state.payments.length}</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={handleEditPayments}>
              <Icon source="pencil-outline" size={14} color={COLORS.purple} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {state.payments.length > 0 ? (
            <View style={styles.paymentsList}>
              {state.payments.map(payment => {
                const getPaymentIcon = (name: string) => {
                  const n = name.toLowerCase();
                  if (n.includes('cash')) return 'cash';
                  if (n.includes('credit') || n.includes('card')) return 'credit-card';
                  if (n.includes('paypal')) return 'alpha-p-box';
                  if (n.includes('venmo')) return 'alpha-v-box';
                  return 'wallet';
                };
                return (
                  <View key={payment.localId} style={styles.paymentCard}>
                    <View style={styles.paymentIconWrapper}>
                      <Icon
                        source={getPaymentIcon(payment.payment_method_name || '')}
                        size={18}
                        color={COLORS.orange}
                      />
                    </View>
                    <Text style={styles.paymentMethod}>{payment.payment_method_name}</Text>
                    <Text style={styles.paymentAmount}>${payment.amount.toFixed(2)}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Icon source="credit-card-off-outline" size={24} color={COLORS.textMuted} />
              <Text style={styles.noDataText}>No payments added</Text>
            </View>
          )}
        </View>

        {/* Created By Section */}
        <View style={styles.section}>
          <View style={styles.inputHeader}>
            <Icon source="account-edit-outline" size={16} color={COLORS.purple} />
            <Text style={styles.inputHeaderText}>Created By</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          <TextInput
            style={[
              styles.createdByInput,
              !state.createdBy?.trim() && styles.inputRequired,
            ]}
            placeholder="Enter your name"
            placeholderTextColor={COLORS.textMuted}
            value={state.createdBy}
            onChangeText={text => dispatch({type: 'SET_CREATED_BY', payload: text})}
          />
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <View style={styles.inputHeader}>
            <Icon source="note-text-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.inputHeaderText}>Notes</Text>
            <Text style={styles.optionalBadge}>Optional</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes about this transaction..."
            placeholderTextColor={COLORS.textMuted}
            value={state.notes}
            onChangeText={text => dispatch({type: 'SET_NOTES', payload: text})}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Transaction Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryHeader}>
            <Icon source="calculator-variant" size={20} color={COLORS.purple} />
            <Text style={styles.summaryTitle}>Transaction Summary</Text>
          </View>

          <View style={styles.summaryCard}>
            {/* Values Section */}
            <View style={styles.summaryValuesRow}>
              <View style={styles.summaryValueBox}>
                <Text style={styles.summaryValueBoxLabel}>Sell Value</Text>
                <Text style={styles.summaryValueBoxAmount}>${totalSellValue.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryValueDivider}>
                <Icon source="minus" size={16} color={COLORS.textMuted} />
              </View>
              <View style={styles.summaryValueBox}>
                <Text style={styles.summaryValueBoxLabel}>Buy Cost</Text>
                <Text style={[styles.summaryValueBoxAmount, styles.summaryValueBoxAmountCost]}>
                  ${totalBuyAmount.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            {/* Payments Row */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <Icon source="check-circle" size={16} color={COLORS.green} />
                <Text style={styles.summaryLabel}>Total Payments</Text>
              </View>
              <Text style={styles.summaryValueGreen}>${totalPayments.toFixed(2)}</Text>
            </View>

            {remainingAmount > 0.01 && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryRowLeft}>
                  <Icon source="alert-circle" size={16} color={COLORS.orange} />
                  <Text style={[styles.summaryLabel, {color: COLORS.orange}]}>Remaining</Text>
                </View>
                <Text style={[styles.summaryValue, {color: COLORS.orange}]}>
                  ${remainingAmount.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Profit Section */}
            <View style={[styles.profitBox, profit >= 0 ? styles.profitBoxPositive : styles.profitBoxNegative]}>
              <View style={styles.profitLeft}>
                <Icon
                  source={profit >= 0 ? 'trending-up' : 'trending-down'}
                  size={24}
                  color={profit >= 0 ? COLORS.green : COLORS.danger}
                />
                <Text style={styles.profitLabel}>Expected Profit</Text>
              </View>
              <Text style={[styles.profitValue, {color: profit >= 0 ? COLORS.green : COLORS.danger}]}>
                ${profit.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* Top Row: Save Draft and Save Pending */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDraft]}
              onPress={handleSaveDraft}
              disabled={isAnyLoading}
              activeOpacity={0.8}>
              {isSavingDraft ? (
                <ActivityIndicator size="small" color={COLORS.orange} />
              ) : (
                <Icon source="content-save-outline" size={20} color={COLORS.orange} />
              )}
              <Text style={styles.actionBtnDraftText}>
                {isSavingDraft ? 'Saving...' : 'Save Draft'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPending]}
              onPress={handleSavePending}
              disabled={isAnyLoading}
              activeOpacity={0.8}>
              {isSavingPending ? (
                <ActivityIndicator size="small" color={COLORS.purple} />
              ) : (
                <Icon source="clock-outline" size={20} color={COLORS.purple} />
              )}
              <Text style={styles.actionBtnPendingText}>
                {isSavingPending ? 'Saving...' : 'Save Pending'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Row: Complete Buy */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnComplete, isAnyLoading && styles.actionBtnDisabled]}
            onPress={handleComplete}
            disabled={isAnyLoading}
            activeOpacity={0.8}>
            {isCompleting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Icon source="check-circle" size={22} color={COLORS.white} />
            )}
            <Text style={styles.actionBtnCompleteText}>
              {isCompleting ? 'Completing...' : 'Complete Buy'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          disabled={isAnyLoading}>
          <Icon source="arrow-left" size={20} color={COLORS.textSecondary} />
          <Text style={styles.backButtonText}>Back to Items</Text>
        </TouchableOpacity>
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
  // Section
  section: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconGreen: {
    backgroundColor: COLORS.green,
  },
  sectionIconOrange: {
    backgroundColor: COLORS.orange,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  countBadge: {
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginRight: SPACING.xs,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.purple + '15',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.purple + '30',
  },
  editButtonText: {
    fontSize: 12,
    color: COLORS.purple,
    fontWeight: '500',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.xs,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  // Customer
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarNew: {
    backgroundColor: COLORS.green,
  },
  customerAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  customerInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  customerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 4,
  },
  customerEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  customerPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  newCustomerBadge: {
    backgroundColor: COLORS.green,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  newCustomerBadgeText: {
    fontSize: 9,
    color: COLORS.white,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  // Items
  itemsList: {
    gap: SPACING.sm,
  },
  itemCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.green,
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  itemQtyBadge: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    minWidth: 36,
    alignItems: 'center',
  },
  itemQtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  itemConditionBadge: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    alignSelf: 'flex-start',
  },
  itemConditionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  itemPriceRow: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemPriceCol: {
    flex: 1,
  },
  itemTotalCol: {
    alignItems: 'flex-end',
  },
  itemPriceLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  itemSellPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green,
  },
  itemCostPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.orange,
  },
  itemTotalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Payments
  paymentsList: {
    gap: SPACING.xs,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  paymentIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.orange + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethod: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.green,
  },
  // Input Fields
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  inputHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.orange,
    textTransform: 'uppercase',
  },
  optionalBadge: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  createdByInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.white,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputRequired: {
    borderColor: COLORS.orange + '50',
  },
  notesInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.white,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Summary
  summarySection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  summaryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.purple + '30',
  },
  summaryValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryValueBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  summaryValueBoxLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryValueBoxAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.green,
  },
  summaryValueBoxAmountCost: {
    color: COLORS.textPrimary,
  },
  summaryValueDivider: {
    paddingHorizontal: SPACING.sm,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryValueGreen: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green,
  },
  // Profit Box
  profitBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  profitBoxPositive: {
    backgroundColor: COLORS.green + '15',
    borderWidth: 1,
    borderColor: COLORS.green + '30',
  },
  profitBoxNegative: {
    backgroundColor: COLORS.danger + '15',
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  profitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  profitLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  profitValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  // Action Buttons
  actionButtonsContainer: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
    height: 50,
  },
  actionBtnDraft: {
    backgroundColor: COLORS.orange + '15',
    borderWidth: 1,
    borderColor: COLORS.orange + '40',
  },
  actionBtnDraftText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.orange,
  },
  actionBtnPending: {
    backgroundColor: COLORS.purple + '15',
    borderWidth: 1,
    borderColor: COLORS.purple + '40',
  },
  actionBtnPendingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.purple,
  },
  actionBtnComplete: {
    backgroundColor: COLORS.green,
    height: 54,
  },
  actionBtnCompleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

export default Step4ReviewScreen;
