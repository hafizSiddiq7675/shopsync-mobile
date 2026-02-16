import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {BuyStackParamList, Buy, BuyItem, ItemCondition} from '@types';
import {COLORS, SPACING, RADIUS} from '@constants/theme';
import {getBuyById, addBuyItemsToInventory} from '@services/buyService';
import Header from '@components/Header';

type BuyDetailsNavigationProp = NativeStackNavigationProp<BuyStackParamList, 'BuyDetails'>;
type BuyDetailsRouteProp = RouteProp<BuyStackParamList, 'BuyDetails'>;

const CONDITION_LABELS: Record<ItemCondition, string> = {
  new: 'New',
  nm: 'Near Mint',
  lp: 'Lightly Played',
  mp: 'Moderately Played',
  hp: 'Heavily Played',
  dmg: 'Damaged',
};

const BuyDetailsScreen: React.FC = () => {
  const navigation = useNavigation<BuyDetailsNavigationProp>();
  const route = useRoute<BuyDetailsRouteProp>();
  const {buyId} = route.params;

  const [buy, setBuy] = useState<Buy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isAddingToInventory, setIsAddingToInventory] = useState(false);

  useEffect(() => {
    loadBuy();
  }, [buyId]);

  const loadBuy = async () => {
    setIsLoading(true);
    const data = await getBuyById(buyId);
    setBuy(data);
    setIsLoading(false);
  };

  const toggleItemSelection = (itemId: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllNotInInventory = () => {
    if (!buy) return;
    const notInInventory = buy.items.filter(item => !item.added_to_inventory).map(item => item.id);
    setSelectedItems(new Set(notInInventory));
  };

  const handleAddToInventory = async () => {
    if (selectedItems.size === 0) {
      Toast.show({type: 'info', text1: 'Select items to add to inventory'});
      return;
    }
    setIsAddingToInventory(true);
    const result = await addBuyItemsToInventory(buyId, Array.from(selectedItems));
    setIsAddingToInventory(false);

    if (result.success) {
      Toast.show({type: 'success', text1: 'Items added to inventory'});
      loadBuy(); // Refresh
      setSelectedItems(new Set());
    } else {
      Toast.show({type: 'error', text1: result.message || 'Failed to add to inventory'});
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return COLORS.green;
      case 'pending':
        return COLORS.orange;
      default:
        return COLORS.textSecondary;
    }
  };

  if (isLoading || !buy) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Buy Details" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
        </View>
      </SafeAreaView>
    );
  }

  const notInInventoryCount = buy.items.filter(item => !item.added_to_inventory).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={buy.buy_number}
        showBackButton
        onBackPress={() => navigation.goBack()}
        showNotification={false}
        showLogout={false}
        rightComponent={
          buy.status !== 'completed' ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('BuyWizard', {buyId: buy.id})}>
              <Icon source="pencil" size={20} color={COLORS.white} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status & Date */}
        <View style={styles.statusBar}>
          <View style={[styles.statusBadge, {backgroundColor: getStatusColor(buy.status) + '20'}]}>
            <Icon
              source={buy.status === 'completed' ? 'check-circle' : 'clock-outline'}
              size={16}
              color={getStatusColor(buy.status)}
            />
            <Text style={[styles.statusText, {color: getStatusColor(buy.status)}]}>
              {buy.status.charAt(0).toUpperCase() + buy.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(buy.created_at).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* Created By Section */}
        {buy.created_by && (
          <View style={styles.section}>
            <View style={styles.createdByRow}>
              <Icon source="account-edit-outline" size={18} color={COLORS.purple} />
              <Text style={styles.createdByLabel}>Created By:</Text>
              <Text style={styles.createdByValue}>{buy.created_by}</Text>
            </View>
          </View>
        )}

        {/* Customer Section */}
        {buy.customer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <View style={styles.customerCard}>
              <View style={styles.customerAvatar}>
                <Icon source="account" size={24} color={COLORS.purple} />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{buy.customer.name}</Text>
                <Text style={styles.customerEmail}>{buy.customer.email}</Text>
                {buy.customer.phone && (
                  <Text style={styles.customerPhone}>{buy.customer.phone}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items ({buy.items.length})</Text>
            {buy.status === 'completed' && notInInventoryCount > 0 && (
              <TouchableOpacity onPress={selectAllNotInInventory}>
                <Text style={styles.selectAllText}>Select All</Text>
              </TouchableOpacity>
            )}
          </View>

          {buy.items.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemCard,
                selectedItems.has(item.id) && styles.itemCardSelected,
              ]}
              onPress={() => buy.status === 'completed' && !item.added_to_inventory && toggleItemSelection(item.id)}
              disabled={buy.status !== 'completed' || item.added_to_inventory}>
              {buy.status === 'completed' && (
                <View style={styles.itemCheckbox}>
                  {item.added_to_inventory ? (
                    <Icon source="check-circle" size={22} color={COLORS.green} />
                  ) : selectedItems.has(item.id) ? (
                    <Icon source="checkbox-marked" size={22} color={COLORS.purple} />
                  ) : (
                    <Icon source="checkbox-blank-outline" size={22} color={COLORS.textSecondary} />
                  )}
                </View>
              )}
              <View style={styles.itemContent}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemDetailText}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemDetailText}>{CONDITION_LABELS[item.condition]}</Text>
                </View>
                <View style={styles.itemPrices}>
                  <Text style={styles.itemCost}>Cost: ${item.cost_basis.toFixed(2)}</Text>
                  <Text style={styles.itemSell}>Sell: ${item.sell_price.toFixed(2)}</Text>
                </View>
                {item.added_to_inventory && (
                  <View style={styles.inventoryBadge}>
                    <Icon source="check" size={12} color={COLORS.green} />
                    <Text style={styles.inventoryBadgeText}>In Inventory</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {buy.status === 'completed' && notInInventoryCount > 0 && (
            <TouchableOpacity
              style={[
                styles.addToInventoryButton,
                selectedItems.size === 0 && styles.addToInventoryButtonDisabled,
              ]}
              onPress={handleAddToInventory}
              disabled={isAddingToInventory || selectedItems.size === 0}>
              {isAddingToInventory ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Icon source="package-variant-plus" size={20} color={COLORS.white} />
                  <Text style={styles.addToInventoryText}>
                    Add Selected to Inventory ({selectedItems.size})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Paid:</Text>
              <Text style={styles.summaryValue}>${buy.total_buy_amount.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Expected Sell:</Text>
              <Text style={styles.summaryValue}>${buy.total_sell_value.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowProfit]}>
              <Text style={styles.summaryLabel}>Profit:</Text>
              <Text
                style={[
                  styles.summaryValueProfit,
                  {color: buy.profit >= 0 ? COLORS.green : COLORS.danger},
                ]}>
                ${buy.profit.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payments</Text>
          {buy.payments.map(payment => (
            <View key={payment.id} style={styles.paymentRow}>
              <Icon source="credit-card-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.paymentMethod}>{payment.payment_method_name}</Text>
              <Text style={styles.paymentAmount}>${payment.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Notes Section */}
        {buy.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{buy.notes}</Text>
          </View>
        )}

        {/* Photos Section */}
        {buy.photos && buy.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({buy.photos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {buy.photos.map((photo, index) => (
                <View key={index} style={styles.photoPlaceholder}>
                  <Icon source="image" size={32} color={COLORS.textMuted} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{height: 100}} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  section: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  selectAllText: {
    color: COLORS.purple,
    fontSize: 13,
    fontWeight: '500',
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  customerEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customerPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemCardSelected: {
    borderColor: COLORS.purple,
    backgroundColor: COLORS.purple + '10',
  },
  itemCheckbox: {
    marginRight: SPACING.sm,
    paddingTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.white,
  },
  itemDetails: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: 4,
  },
  itemDetailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  itemPrices: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  itemCost: {
    fontSize: 13,
    color: COLORS.orange,
  },
  itemSell: {
    fontSize: 13,
    color: COLORS.green,
  },
  inventoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
    backgroundColor: COLORS.green + '20',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  inventoryBadgeText: {
    fontSize: 11,
    color: COLORS.green,
    fontWeight: '500',
  },
  addToInventoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  addToInventoryButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  addToInventoryText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  summaryRowProfit: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  summaryValueProfit: {
    fontSize: 16,
    fontWeight: '700',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  paymentMethod: {
    flex: 1,
    fontSize: 14,
    color: COLORS.white,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  createdByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  createdByLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  createdByValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default BuyDetailsScreen;
