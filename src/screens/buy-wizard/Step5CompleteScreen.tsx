import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
  Easing,
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
const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Confetti colors
const CONFETTI_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#F38181', // Coral
  '#AA96DA', // Purple
  '#FCBAD3', // Pink
  '#A8D8EA', // Light Blue
  COLORS.purple,
  COLORS.green,
];

// Celebration icons
const CELEBRATION_ICONS = ['star', 'heart', 'star-outline', 'party-popper', 'confetti'];

// Single Confetti Piece Component
interface ConfettiPieceProps {
  delay: number;
  startX: number;
  color: string;
  size: number;
  duration: number;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({delay, startX, color, size, duration}) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(startX)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT + 100,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: startX + (Math.random() - 0.5) * 100,
          duration: duration,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: Math.random() > 0.5 ? 360 : -360,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: duration,
          delay: duration * 0.7,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          width: size,
          height: size * 0.6,
          backgroundColor: color,
          borderRadius: size * 0.15,
          transform: [{translateX}, {translateY}, {rotate: spin}],
          opacity,
        },
      ]}
    />
  );
};

// Floating Celebration Icon Component
interface FloatingIconProps {
  icon: string;
  startX: number;
  startY: number;
  delay: number;
}

const FloatingIcon: React.FC<FloatingIconProps> = ({icon, startX, startY, delay}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scale, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0,
            duration: 800,
            delay: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 800,
            delay: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(translateY, {
          toValue: -80,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: (Math.random() - 0.5) * 40,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: (Math.random() - 0.5) * 40,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={[
        styles.floatingIcon,
        {
          left: startX,
          top: startY,
          transform: [{translateX}, {translateY}, {scale}],
          opacity,
        },
      ]}>
      <Icon source={icon} size={24} color={COLORS.yellow || '#FFE66D'} />
    </Animated.View>
  );
};

// Sparkle Component
interface SparkleProps {
  x: number;
  y: number;
  delay: number;
  size: number;
}

const Sparkle: React.FC<SparkleProps> = ({x, y, delay, size}) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(rotate, {
              toValue: 180,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(rotate, {
              toValue: 360,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(Math.random() * 1000 + 500),
        ])
      );
      animation.start();
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          transform: [{scale}, {rotate: spin}],
          opacity,
        },
      ]}>
      <Icon source="star-four-points" size={size} color="#FFE66D" />
    </Animated.View>
  );
};

const Step5CompleteScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {state, dispatch, totalSellValue, totalBuyAmount, profit, totalPayments} = useBuyWizard();

  // Generate confetti pieces
  const [confettiPieces] = useState(() =>
    Array.from({length: 50}, (_, i) => ({
      id: i,
      delay: Math.random() * 1500,
      startX: Math.random() * SCREEN_WIDTH,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 10 + 6,
      duration: Math.random() * 2000 + 3000,
    }))
  );

  // Generate floating icons
  const [floatingIcons] = useState(() =>
    Array.from({length: 8}, (_, i) => ({
      id: i,
      icon: CELEBRATION_ICONS[Math.floor(Math.random() * CELEBRATION_ICONS.length)],
      startX: Math.random() * (SCREEN_WIDTH - 50) + 25,
      startY: Math.random() * 200 + 100,
      delay: Math.random() * 2000 + 500,
    }))
  );

  // Generate sparkles around the check icon
  const [sparkles] = useState(() =>
    Array.from({length: 6}, (_, i) => {
      const angle = (i * 60 * Math.PI) / 180;
      const radius = 80;
      return {
        id: i,
        x: SCREEN_WIDTH / 2 + Math.cos(angle) * radius - 10,
        y: 120 + Math.sin(angle) * radius,
        delay: i * 200 + 500,
        size: Math.random() * 12 + 16,
      };
    })
  );

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardSlideAnim = useRef(new Animated.Value(80)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for success icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Checkmark draw animation
  const checkmarkProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Run entrance animations
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
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
        Animated.timing(checkmarkProgress, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
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

    // Start glow animation
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 1000,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Start pulse animation loop
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, []);

  // Handle navigation
  const handleViewBuys = () => {
    dispatch({type: 'RESET'});
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'BuyList' as any}],
      })
    );
  };

  const handleNewBuy = () => {
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
    if (!name) return '?';

    // Filter out empty parts and trim
    const parts = name.trim().split(' ').filter(p => p.length > 0);

    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (parts.length > 0 && parts[0]) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return '?';
  };

  // Calculate total quantity
  const totalQuantity = state.items.reduce((sum, item) => sum + item.quantity, 0);

  // Interpolate glow opacity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Confetti Layer */}
      <View style={styles.confettiContainer} pointerEvents="none">
        {confettiPieces.map(piece => (
          <ConfettiPiece
            key={piece.id}
            delay={piece.delay}
            startX={piece.startX}
            color={piece.color}
            size={piece.size}
            duration={piece.duration}
          />
        ))}
      </View>

      {/* Floating Icons Layer */}
      <View style={styles.floatingIconsContainer} pointerEvents="none">
        {floatingIcons.map(icon => (
          <FloatingIcon
            key={icon.id}
            icon={icon.icon}
            startX={icon.startX}
            startY={icon.startY}
            delay={icon.delay}
          />
        ))}
      </View>

      {/* Sparkles Layer */}
      <View style={styles.sparklesContainer} pointerEvents="none">
        {sparkles.map(sparkle => (
          <Sparkle
            key={sparkle.id}
            x={sparkle.x}
            y={sparkle.y}
            delay={sparkle.delay}
            size={sparkle.size}
          />
        ))}
      </View>

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
        {/* Success Icon with Glow and Pulse */}
        <Animated.View
          style={[
            styles.successIconContainer,
            {transform: [{scale: scaleAnim}]},
          ]}>
          {/* Glow Effect */}
          <Animated.View
            style={[
              styles.successGlow,
              {opacity: glowOpacity},
            ]}
          />

          {/* Pulsing Outer Ring */}
          <Animated.View
            style={[
              styles.successIconOuter,
              {transform: [{scale: pulseAnim}]},
            ]}>
            {/* Inner Circle with Checkmark */}
            <View style={styles.successIconInner}>
              <Animated.View style={{transform: [{scale: checkmarkProgress}]}}>
                <Icon source="check-bold" size={48} color={COLORS.white} />
              </Animated.View>
            </View>
          </Animated.View>
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
          {/* Accent Gradient Bar */}
          <View style={styles.cardAccentBar} />

          {/* Customer Section */}
          <View style={styles.customerSection}>
            <View style={styles.customerAvatarOuter}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>{getCustomerInitials()}</Text>
              </View>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{getCustomerName()}</Text>
              <View style={styles.customerVerifiedRow}>
                <Icon source="check-decagram" size={14} color={COLORS.green} />
                <Text style={styles.customerVerifiedText}>Verified Customer</Text>
              </View>
            </View>
          </View>

          {/* Stats Row - Compact */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Icon source="cube-outline" size={16} color={COLORS.purple} />
              <Text style={styles.statChipValue}>{totalQuantity}</Text>
              <Text style={styles.statChipLabel}>items</Text>
            </View>
            <View style={styles.statChip}>
              <Icon source="credit-card-outline" size={16} color={COLORS.orange} />
              <Text style={styles.statChipValue}>{state.payments.length}</Text>
              <Text style={styles.statChipLabel}>payments</Text>
            </View>
            <View style={styles.statChip}>
              <Icon source="cash-check" size={16} color={COLORS.green} />
              <Text style={styles.statChipValue}>${totalPayments.toFixed(0)}</Text>
              <Text style={styles.statChipLabel}>paid</Text>
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
  // Confetti Layer
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
  },
  // Floating Icons Layer
  floatingIconsContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  floatingIcon: {
    position: 'absolute',
  },
  // Sparkles Layer
  sparklesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 98,
  },
  sparkle: {
    position: 'absolute',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    zIndex: 10,
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
    zIndex: 10,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  // Success Icon with Glow
  successIconContainer: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.green,
  },
  successIconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.green + '25',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.green + '40',
  },
  successIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.green,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
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
    padding: SPACING.md,
    width: '100%',
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.green + '30',
  },
  cardAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.green,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.sm,
  },
  customerAvatarOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.green + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.green + '40',
  },
  customerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  customerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
  customerVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  customerVerifiedText: {
    fontSize: 12,
    color: COLORS.green,
    fontWeight: '500',
  },
  // Stats Row - Compact chips
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  statChipValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  statChipLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
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
