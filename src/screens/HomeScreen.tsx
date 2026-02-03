import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, CommonActions} from '@react-navigation/native';
import {Icon} from 'react-native-paper';
import {AuthUser, Shop} from '@types';
import {SPACING} from '@constants/theme';
import {authService} from '@services/authService';

const DARK_BG = '#0D0D1A';
const CARD_BG = '#1A1A2E';
const PURPLE = '#6C63FF';
const PINK = '#FF6B9D';
const GREEN = '#4CAF50';
const ORANGE = '#FF9800';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

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
    {icon: 'cash-register', label: 'Sales', value: '$0', color: GREEN},
    {icon: 'shopping', label: 'Orders', value: '0', color: PURPLE},
    {icon: 'package-variant', label: 'Products', value: '0', color: ORANGE},
    {icon: 'account-group', label: 'Customers', value: '0', color: PINK},
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
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
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Icon source="bell-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleLogout}
            disabled={isLoggingOut}>
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon source="logout" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtitle}>
              Ready to manage your shop today?
            </Text>
          </View>
          <View style={styles.welcomeIcon}>
            <Icon source="store" size={48} color={PURPLE} />
          </View>
        </View>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          {quickStats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  {backgroundColor: stat.color + '20'},
                ]}>
                <Icon source={stat.icon} size={24} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Main Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SaleTab' as never)}>
            <View style={[styles.actionIconWrapper, {backgroundColor: PURPLE}]}>
              <Icon source="cart" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Start Sale</Text>
              <Text style={styles.actionDescription}>
                Sell items to customers
              </Text>
            </View>
            <Icon source="chevron-right" size={24} color="#8B8BA7" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('BuyTab' as never)}>
            <View style={[styles.actionIconWrapper, {backgroundColor: GREEN}]}>
              <Icon source="currency-usd" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Start Buy</Text>
              <Text style={styles.actionDescription}>
                Purchase from vendors
              </Text>
            </View>
            <Icon source="chevron-right" size={24} color="#8B8BA7" />
          </TouchableOpacity>
        </View>

        {/* More Options */}
        <Text style={styles.sectionTitle}>More Options</Text>
        <View style={styles.moreOptions}>
          <TouchableOpacity style={styles.optionItem}>
            <View
              style={[styles.optionIcon, {backgroundColor: ORANGE + '20'}]}>
              <Icon source="history" size={22} color={ORANGE} />
            </View>
            <Text style={styles.optionText}>Transaction History</Text>
            <Icon source="chevron-right" size={20} color="#5A5A7A" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <View style={[styles.optionIcon, {backgroundColor: PINK + '20'}]}>
              <Icon source="chart-line" size={22} color={PINK} />
            </View>
            <Text style={styles.optionText}>Reports & Analytics</Text>
            <Icon source="chevron-right" size={20} color="#5A5A7A" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <View
              style={[styles.optionIcon, {backgroundColor: PURPLE + '20'}]}>
              <Icon source="cog-outline" size={22} color={PURPLE} />
            </View>
            <Text style={styles.optionText}>Settings</Text>
            <Icon source="chevron-right" size={20} color="#5A5A7A" />
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
    backgroundColor: DARK_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PURPLE,
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
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  welcomeContent: {
    flex: 1,
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
    borderRadius: 20,
    backgroundColor: PURPLE + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
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
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: SPACING.md,
  },
  actionIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
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
  moreOptions: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A4A',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    marginLeft: SPACING.md,
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
