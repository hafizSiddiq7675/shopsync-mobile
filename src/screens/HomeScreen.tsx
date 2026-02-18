import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, CommonActions, useFocusEffect} from '@react-navigation/native';
import {Icon} from 'react-native-paper';
import {AuthUser, Shop} from '@types';
import {COLORS, SPACING, RADIUS, SHADOWS} from '@constants/theme';
import Header from '@components/Header';
import {authService} from '@services/authService';
import {getDashboardStats, DashboardStats} from '@services/productService';

// Format large numbers with abbreviations
const formatNumber = (num: number, isCurrency: boolean = false): string => {
  const prefix = isCurrency ? '$' : '';
  if (num >= 1000000) {
    return `${prefix}${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 10000) {
    return `${prefix}${(num / 1000).toFixed(1)}K`;
  }
  if (isCurrency) {
    return `${prefix}${num.toFixed(2)}`;
  }
  return num.toLocaleString();
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  // Refresh stats when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardStats();
    }, []),
  );

  // Load dashboard stats
  const loadDashboardStats = async () => {
    const dashboardStats = await getDashboardStats();
    if (dashboardStats) {
      setStats(dashboardStats);
    }
  };

  // Pull to refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadUserData(), loadDashboardStats()]);
    setIsRefreshing(false);
  };

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const storedUser = await authService.getStoredUser();
      const storedShop = await authService.getStoredShop();
      setUser(storedUser);
      setShop(storedShop);

      if (!storedShop && storedUser) {
        try {
          const response = await authService.getUser();
          if (response.data?.shop) {
            setShop(response.data.shop);
          }
        } catch (error) {
          // Silently fail
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

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

  const quickStats = [
    {
      icon: 'cash-register',
      label: 'Sales',
      value: stats ? formatNumber(stats.today_sales, true) : '$0.00',
      color: COLORS.green,
    },
    {
      icon: 'shopping',
      label: 'Orders',
      value: stats ? formatNumber(stats.today_orders) : '0',
      color: COLORS.purple,
    },
    {
      icon: 'package-variant',
      label: 'Products',
      value: stats ? formatNumber(stats.today_products_sold) : '0',
      color: COLORS.orange,
    },
    {
      icon: 'account-group',
      label: 'Customers',
      value: stats ? formatNumber(stats.today_customers) : '0',
      color: COLORS.pink,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Header
        onLogoutPress={handleLogout}
        isLoggingOut={isLoggingOut}
        leftComponent={
          <View style={styles.userSection}>
            <View style={styles.avatarContainer}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon source="account" size={32} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.userInfo}>
              {isLoading ? (
                <>
                  <View style={styles.skeletonName} />
                  <View style={styles.skeletonShop} />
                </>
              ) : (
                <>
                  <Text style={styles.userName}>{user?.name || 'User'}</Text>
                  <Text style={styles.shopName}>{shop?.name || 'Shop'}</Text>
                </>
              )}
            </View>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.purple}
            colors={[COLORS.purple]}
          />
        }>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeAccent} />
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtitle}>
              Ready to manage your shop today?
            </Text>
          </View>
          <View style={styles.welcomeIcon}>
            <Icon source="store" size={48} color={COLORS.purple} />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.sectionHeader}>
          <Icon source="chart-timeline-variant" size={18} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Today's Overview</Text>
        </View>
        <View style={styles.statsGrid}>
          {quickStats.map((stat, index) => (
            <View key={index} style={[styles.statCard, {borderLeftColor: stat.color}]}>
              <View
                style={[
                  styles.statIconContainer,
                  {backgroundColor: stat.color + '20'},
                ]}>
                <Icon source={stat.icon} size={24} color={stat.color} />
              </View>
              <Text
                style={styles.statValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Main Actions */}
        <View style={styles.sectionHeader}>
          <Icon source="lightning-bolt" size={18} color={COLORS.purple} />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardPurple]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SaleTab' as never)}>
            <View style={[styles.actionIconWrapper, {backgroundColor: COLORS.purple}]}>
              <Icon source="cart" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Start Sale</Text>
              <Text style={styles.actionDescription}>
                Sell items to customers
              </Text>
            </View>
            <Icon source="chevron-right" size={24} color={COLORS.purple} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardGreen]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('BuyTab' as never)}>
            <View style={[styles.actionIconWrapper, {backgroundColor: COLORS.green}]}>
              <Icon source="currency-usd" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Start Buy</Text>
              <Text style={styles.actionDescription}>
                Purchase from vendors
              </Text>
            </View>
            <Icon source="chevron-right" size={24} color={COLORS.green} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Powered by Phantom Card Vault</Text>

        {/* Bottom Spacer */}
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
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: SPACING.md,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shopName: {
    fontSize: 14,
    color: '#8B8BA7',
    marginTop: 2,
  },
  skeletonName: {
    width: 100,
    height: 18,
    backgroundColor: '#2A2A4A',
    borderRadius: 4,
  },
  skeletonShop: {
    width: 70,
    height: 14,
    backgroundColor: '#2A2A4A',
    borderRadius: 4,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.purple + '30',
    overflow: 'hidden',
    ...SHADOWS.purpleGlow,
  },
  welcomeAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.purple,
    borderTopLeftRadius: RADIUS.xl,
    borderBottomLeftRadius: RADIUS.xl,
  },
  welcomeContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#8B8BA7',
    marginTop: 4,
  },
  welcomeIcon: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.purple,
    ...SHADOWS.small,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    color: '#8B8BA7',
    marginTop: 2,
  },
  actionsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
  },
  actionCardPurple: {
    borderColor: COLORS.purple + '40',
    ...SHADOWS.purpleGlow,
  },
  actionCardGreen: {
    borderColor: COLORS.green + '40',
    ...SHADOWS.greenGlow,
  },
  actionIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionDescription: {
    fontSize: 13,
    color: '#8B8BA7',
    marginTop: 2,
  },
  footer: {
    textAlign: 'center',
    color: '#5A5A7A',
    fontSize: 12,
    marginBottom: SPACING.md,
  },
  bottomSpacer: {
    height: 80,
  },
});

export default HomeScreen;
