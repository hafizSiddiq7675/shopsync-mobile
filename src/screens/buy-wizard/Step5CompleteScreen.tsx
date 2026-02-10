import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, CommonActions} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon} from 'react-native-paper';
import {COLORS, SPACING, RADIUS} from '@constants/theme';
import {BuyWizardStackParamList} from '@types';
import {useBuyWizard} from '@contexts/BuyWizardContext';
import {StepIndicator} from '@components/buy-wizard';

type NavigationProp = NativeStackNavigationProp<BuyWizardStackParamList, 'Step5Complete'>;

const STEP_LABELS = ['Customer', 'Payment', 'Items', 'Review', 'Complete'];

const Step5CompleteScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {state, dispatch, totalSellValue, totalBuyAmount, profit, totalPayments} = useBuyWizard();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardSlideAnim = useRef(new Animated.Value(80)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Run animations
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardSlideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // Handle navigation
  const handleViewBuys = () => {
    // Reset wizard state and navigate to buy list
    dispatch({type: 'RESET'});
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'BuyList' as any}],
      })
    );
  };

  const handleNewBuy = () => {
    // Reset wizard state and start fresh
    dispatch({type: 'RESET'});
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'Step1Customer'}],
      })
    );
  };

  // Get customer display name
  const getCustomerName = (): string => {
    if (state.customer) {
      return state.customer.name;
    }
    if (state.newCustomer) {
      return `${state.newCustomer.firstName} ${state.newCustomer.lastName}`;
    }
    return 'Walk-in Customer';
  };

  // Get customer initials
  const getCustomerInitials = (): string => {
    const name = getCustomerName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Calculate total quantity
  const totalQuantity = state.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Complete</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Step Indicator */}
      <StepIndicator currentStep={5} totalSteps={5} labels={STEP_LABELS} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Success Icon */}
        <Animated.View
          style={[
            styles.successIconContainer,
            {transform: [{scale: scaleAnim}]},
          ]}>
          <View style={styles.successIconOuter}>
            <View style={styles.successIconInner}>
              <Icon source="check" size={48} color={COLORS.white} />
            </View>
          </View>
        </Animated.View>

        {/* Success Message */}
        <Animated.View
          style={[
            styles.messageContainer,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <Text style={styles.successTitle}>Buy Completed!</Text>
          <Text style={styles.successSubtitle}>
            Transaction has been successfully recorded
          </Text>
        </Animated.View>

        {/* Main Summary Card */}
        <Animated.View
          style={[
            styles.mainCard,
            {
              opacity: fadeAnim,
              transform: [{translateY: cardSlideAnim}],
            },
          ]}>
          {/* Customer Section */}
          <View style={styles.customerSection}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>{getCustomerInitials()}</Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerLabel}>Customer</Text>
              <Text style={styles.customerName}>{getCustomerName()}</Text>
            </View>
            <View style={styles.customerBadge}>
              <Icon source="check-circle" size={16} color={COLORS.green} />
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIconWrapper, {backgroundColor: COLORS.purple + '20'}]}>
                <Icon source="package-variant" size={20} color={COLORS.purple} />
              </View>
              <Text style={styles.statValue}>{totalQuantity}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIconWrapper, {backgroundColor: COLORS.orange + '20'}]}>
                <Icon source="credit-card-outline" size={20} color={COLORS.orange} />
              </View>
              <Text style={styles.statValue}>{state.payments.length}</Text>
              <Text style={styles.statLabel}>Payments</Text>
            </View>
          </View>
        </Animated.View>

        {/* Financial Summary Card */}
        <Animated.View
          style={[
            styles.financialCard,
            {
              opacity: fadeAnim,
              transform: [{translateY: cardSlideAnim}],
            },
          ]}>
          <View style={styles.financialHeader}>
            <Icon source="chart-line" size={20} color={COLORS.white} />
            <Text style={styles.financialTitle}>Transaction Summary</Text>
          </View>

          <View style={styles.financialGrid}>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Sell Value</Text>
              <Text style={styles.financialValueGreen}>${totalSellValue.toFixed(2)}</Text>
            </View>

            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Buy Cost</Text>
              <Text style={styles.financialValueOrange}>${totalBuyAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Total Paid</Text>
              <Text style={styles.financialValue}>${totalPayments.toFixed(2)}</Text>
            </View>
          </View>

          {/* Profit Box */}
          <View style={[
            styles.profitBox,
            profit >= 0 ? styles.profitBoxPositive : styles.profitBoxNegative
          ]}>
            <View style={styles.profitLeft}>
              <Icon
                source={profit >= 0 ? 'trending-up' : 'trending-down'}
                size={28}
                color={profit >= 0 ? COLORS.green : COLORS.danger}
              />
              <Text style={styles.profitLabel}>Expected Profit</Text>
            </View>
            <Text style={[
              styles.profitValue,
              {color: profit >= 0 ? COLORS.green : COLORS.danger}
            ]}>
              ${Math.abs(profit).toFixed(2)}
            </Text>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[styles.buttonsContainer, {opacity: buttonFadeAnim}]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleNewBuy}
            activeOpacity={0.8}>
            <View style={styles.primaryButtonIcon}>
              <Icon source="plus" size={24} color={COLORS.white} />
            </View>
            <View style={styles.primaryButtonContent}>
              <Text style={styles.primaryButtonText}>Create Another Buy</Text>
              <Text style={styles.primaryButtonSubtext}>Start a new transaction</Text>
            </View>
            <Icon source="chevron-right" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewBuys}
            activeOpacity={0.8}>
            <View style={styles.secondaryButtonIcon}>
              <Icon source="format-list-bulleted" size={22} color={COLORS.purple} />
            </View>
            <View style={styles.secondaryButtonContent}>
              <Text style={styles.secondaryButtonText}>View All Buys</Text>
              <Text style={styles.secondaryButtonSubtext}>See transaction history</Text>
            </View>
            <Icon source="chevron-right" size={24} color={COLORS.purple} />
          </TouchableOpacity>
        </Animated.View>
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
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  // Success Icon
  successIconContainer: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  successIconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.green + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Message
  messageContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  successSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Main Card
  mainCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  customerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  customerLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 2,
  },
  customerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.green + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: COLORS.border,
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // Financial Card
  financialCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.purple + '30',
  },
  financialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  financialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  financialGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  financialItem: {
    alignItems: 'center',
    flex: 1,
  },
  financialLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  financialValueGreen: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.green,
  },
  financialValueOrange: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.orange,
  },
  // Profit Box
  profitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  profitBoxPositive: {
    backgroundColor: COLORS.green + '15',
    borderWidth: 1,
    borderColor: COLORS.green + '40',
  },
  profitBoxNegative: {
    backgroundColor: COLORS.danger + '15',
    borderWidth: 1,
    borderColor: COLORS.danger + '40',
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
    fontSize: 26,
    fontWeight: '700',
  },
  // Buttons
  buttonsContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  primaryButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
  primaryButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    paddingVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.purple + '40',
  },
  secondaryButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
  secondaryButtonSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

export default Step5CompleteScreen;
