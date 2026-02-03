import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon} from 'react-native-paper';
import {RootStackParamList, TabParamList} from '@types';
import {SPACING} from '@constants/theme';
import {useAppSelector} from '@store';

type BuyScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'BuyTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type BuyScreenProps = {
  navigation: BuyScreenNavigationProp;
};

const DARK_BG = '#0D0D1A';
const CARD_BG = '#1A1A2E';
const PURPLE = '#6C63FF';
const PINK = '#FF6B9D';
const GREEN = '#4CAF50';
const ORANGE = '#FF9800';

const BuyScreen: React.FC<BuyScreenProps> = ({navigation}) => {
  const cartItems = useAppSelector(state => state.cart.items);
  const cartTotal = useAppSelector(state => state.cart.total);

  const quickActions = [
    {icon: 'barcode-scan', label: 'Scan', color: GREEN},
    {icon: 'magnify', label: 'Search', color: PINK},
    {icon: 'history', label: 'Recent', color: ORANGE},
  ];

  const recentPurchases = [
    {name: 'Supplier Item 1', price: '$45.00', qty: 10},
    {name: 'Supplier Item 2', price: '$28.50', qty: 5},
    {name: 'Supplier Item 3', price: '$120.00', qty: 20},
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('HomeTab')}>
          <Icon source="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>New Purchase</Text>
        <TouchableOpacity style={styles.cartButton}>
          <Icon source="cart" size={24} color="#FFFFFF" />
          {cartItems.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <TouchableOpacity key={index} style={styles.actionButton}>
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
          <TouchableOpacity style={styles.scanButton}>
            <View style={styles.scanIconWrapper}>
              <Icon source="barcode-scan" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.scanTextWrapper}>
              <Text style={styles.scanTitle}>Scan Product</Text>
              <Text style={styles.scanSubtitle}>
                Scan barcode to add items
              </Text>
            </View>
            <Icon source="chevron-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.searchButton}>
            <View style={styles.searchIconWrapper}>
              <Icon source="magnify" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.searchTextWrapper}>
              <Text style={styles.searchTitle}>Search Products</Text>
              <Text style={styles.searchSubtitle}>
                Find by name or SKU
              </Text>
            </View>
            <Icon source="chevron-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.vendorButton}>
            <View style={styles.vendorIconWrapper}>
              <Icon source="account-group" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.vendorTextWrapper}>
              <Text style={styles.vendorTitle}>Select Vendor</Text>
              <Text style={styles.vendorSubtitle}>
                Choose supplier for purchase
              </Text>
            </View>
            <Icon source="chevron-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Recent Purchases */}
        <Text style={styles.sectionTitle}>Recent Purchases</Text>
        <View style={styles.recentList}>
          {recentPurchases.map((item, index) => (
            <TouchableOpacity key={index} style={styles.recentItem}>
              <View style={styles.recentIcon}>
                <Icon source="package-variant" size={24} color={GREEN} />
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentName}>{item.name}</Text>
                <Text style={styles.recentQty}>Qty: {item.qty}</Text>
              </View>
              <Text style={styles.recentPrice}>{item.price}</Text>
              <TouchableOpacity style={styles.addButton}>
                <Icon source="plus" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => navigation.navigate('Cart')}>
          <Icon source="cash-register" size={24} color="#FFFFFF" />
          <Text style={styles.checkoutText}>Complete Purchase</Text>
          <View style={styles.checkoutBadge}>
            <Text style={styles.checkoutBadgeText}>
              ${cartTotal.toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Spacer for bottom */}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: PINK,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
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
    color: '#FFFFFF',
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
    color: '#8B8BA7',
    fontWeight: '500',
  },
  mainActions: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN,
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
    color: '#FFFFFF',
  },
  scanSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  searchIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: PINK + '20',
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
    color: '#FFFFFF',
  },
  searchSubtitle: {
    fontSize: 13,
    color: '#8B8BA7',
    marginTop: 2,
  },
  vendorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  vendorIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: PURPLE + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorTextWrapper: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  vendorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  vendorSubtitle: {
    fontSize: 13,
    color: '#8B8BA7',
    marginTop: 2,
  },
  recentList: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: 'hidden',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A4A',
  },
  recentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: GREEN + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  recentName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  recentQty: {
    fontSize: 13,
    color: '#8B8BA7',
    marginTop: 2,
  },
  recentPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: GREEN,
    marginRight: SPACING.md,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  bottomSpacer: {
    height: 80,
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },
});

export default BuyScreen;
