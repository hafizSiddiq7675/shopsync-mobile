import React, {useState} from 'react';
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
import {ItemCondition, CostEntryMode, BuyWizardStackParamList} from '@types';
import {useBuyWizard, LocalBuyItem} from '@contexts/BuyWizardContext';
import {StepIndicator, WizardFooter} from '@components/buy-wizard';
import DraggableBottomSheet from '@components/DraggableBottomSheet';

type NavigationProp = NativeStackNavigationProp<BuyWizardStackParamList, 'Step3Items'>;

const CONDITION_OPTIONS: {label: string; value: ItemCondition}[] = [
  {label: 'New', value: 'new'},
  {label: 'Near Mint', value: 'nm'},
  {label: 'Lightly Played', value: 'lp'},
  {label: 'Moderately Played', value: 'mp'},
  {label: 'Heavily Played', value: 'hp'},
  {label: 'Damaged', value: 'dmg'},
];

const STEP_LABELS = ['Customer', 'Payment', 'Items', 'Review', 'Complete'];

const Step3ItemsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    state,
    dispatch,
    totalSellValue,
    totalBuyAmount,
    getItemCostBasis,
    saveCostMode,
    addItemToServer,
    updateItemOnServer,
    deleteItemFromServer,
  } = useBuyWizard();

  // Item modal state
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<LocalBuyItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemCondition, setItemCondition] = useState<ItemCondition>('nm');
  const [itemCost, setItemCost] = useState('');
  const [itemSellPrice, setItemSellPrice] = useState('');
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Action menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Set cost entry mode
  const setCostEntryMode = async (mode: CostEntryMode) => {
    dispatch({type: 'SET_COST_ENTRY_MODE', payload: mode});
    // Auto-save to server
    if (state.buyId) {
      const totalAmount = mode === 'allocate' ? parseFloat(state.allocateTotalAmount) || 0 : undefined;
      await saveCostMode(mode, totalAmount);
    }
  };

  // Set allocate total
  const setAllocateTotalAmount = async (amount: string) => {
    dispatch({type: 'SET_ALLOCATE_TOTAL', payload: amount});
    // Auto-save to server (debounced would be better, but keeping it simple)
  };

  // Save allocate total on blur
  const handleAllocateTotalBlur = async () => {
    if (state.buyId && state.costEntryMode === 'allocate') {
      const totalAmount = parseFloat(state.allocateTotalAmount) || 0;
      await saveCostMode(state.costEntryMode, totalAmount);
    }
  };

  // Close item modal
  const closeItemModal = () => {
    setItemModalVisible(false);
    setEditingItem(null);
    setItemName('');
    setItemQuantity('1');
    setItemCondition('nm');
    setItemCost('');
    setItemSellPrice('');
  };

  // Open edit item
  const openEditItem = (item: LocalBuyItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemQuantity(item.quantity.toString());
    setItemCondition(item.condition);
    setItemCost(item.cost_basis.toString());
    setItemSellPrice(item.sell_price.toString());
    setItemModalVisible(true);
  };

  // Save item
  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      Toast.show({type: 'error', text1: 'Item name is required'});
      return;
    }
    const sellPrice = parseFloat(itemSellPrice) || 0;
    if (sellPrice <= 0) {
      Toast.show({type: 'error', text1: 'Sell price is required'});
      return;
    }

    const cost = parseFloat(itemCost) || 0;
    const qty = parseInt(itemQuantity) || 1;

    setIsSavingItem(true);

    if (editingItem) {
      const updatedItem: LocalBuyItem = {
        ...editingItem,
        name: itemName,
        quantity: qty,
        condition: itemCondition,
        cost_basis: cost,
        sell_price: sellPrice,
      };

      // Update locally first
      dispatch({type: 'UPDATE_ITEM', payload: updatedItem});

      // Update on server if has server ID
      if (updatedItem.serverId) {
        const success = await updateItemOnServer(updatedItem);
        if (!success) {
          setIsSavingItem(false);
          return;
        }
      }
    } else {
      const newItem: LocalBuyItem = {
        localId: `item_${Date.now()}`,
        name: itemName,
        quantity: qty,
        condition: itemCondition,
        cost_basis: cost,
        sell_price: sellPrice,
      };

      // Add locally first
      dispatch({type: 'ADD_ITEM', payload: newItem});

      // Add to server
      if (state.buyId) {
        const result = await addItemToServer(newItem);
        if (result.success && result.serverId) {
          // Update with server ID
          dispatch({
            type: 'SET_ITEM_SERVER_ID',
            payload: {localId: newItem.localId, serverId: result.serverId},
          });
        } else if (!result.success) {
          // Remove from local state if server failed
          dispatch({type: 'REMOVE_ITEM', payload: newItem.localId});
          setIsSavingItem(false);
          return;
        }
      }
    }

    setIsSavingItem(false);
    closeItemModal();
  };

  // Remove item
  const removeItem = async (localId: string) => {
    const item = state.items.find(i => i.localId === localId);
    if (!item) return;

    // Delete from server first if has server ID
    if (item.serverId) {
      const success = await deleteItemFromServer(item);
      if (!success) {
        return; // Don't remove locally if server delete failed
      }
    }

    // Remove locally
    dispatch({type: 'REMOVE_ITEM', payload: localId});
  };

  // Navigate to next step
  const handleNext = () => {
    if (state.items.length === 0) {
      Toast.show({type: 'error', text1: 'Add at least one item'});
      return;
    }
    if (state.costEntryMode === 'allocate' && (parseFloat(state.allocateTotalAmount) || 0) <= 0) {
      Toast.show({type: 'error', text1: 'Enter Total Buy Amount for allocation'});
      return;
    }
    navigation.navigate('Step4Review');
  };

  // Go back
  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon source="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Items</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Step Indicator */}
      <StepIndicator currentStep={3} totalSteps={5} labels={STEP_LABELS} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Items Purchased</Text>
        <Text style={styles.subtitle}>
          Add items the customer is selling to you.
        </Text>

        {/* Cost Entry Mode Toggle */}
        <View style={styles.costModeSection}>
          <Text style={styles.costModeLabel}>Cost Entry Mode</Text>
          <View style={styles.costModeToggle}>
            <TouchableOpacity
              style={[
                styles.costModeBtn,
                state.costEntryMode === 'manual' && styles.costModeBtnActive,
              ]}
              onPress={() => setCostEntryMode('manual')}
              activeOpacity={0.8}>
              <View style={[
                styles.costModeIconWrapper,
                state.costEntryMode === 'manual' && styles.costModeIconWrapperActive,
              ]}>
                <Icon
                  source="pencil-outline"
                  size={20}
                  color={state.costEntryMode === 'manual' ? COLORS.white : COLORS.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.costModeBtnTitle,
                  state.costEntryMode === 'manual' && styles.costModeBtnTitleActive,
                ]}>
                Manual
              </Text>
              <Text style={styles.costModeBtnSubtitle}>Per item cost</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.costModeBtn,
                state.costEntryMode === 'allocate' && styles.costModeBtnActive,
              ]}
              onPress={() => setCostEntryMode('allocate')}
              activeOpacity={0.8}>
              <View style={[
                styles.costModeIconWrapper,
                state.costEntryMode === 'allocate' && styles.costModeIconWrapperActive,
              ]}>
                <Icon
                  source="percent-outline"
                  size={20}
                  color={state.costEntryMode === 'allocate' ? COLORS.white : COLORS.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.costModeBtnTitle,
                  state.costEntryMode === 'allocate' && styles.costModeBtnTitleActive,
                ]}>
                Allocate
              </Text>
              <Text style={styles.costModeBtnSubtitle}>By % of value</Text>
            </TouchableOpacity>
          </View>

          {/* Total Buy Amount input for allocate mode */}
          {state.costEntryMode === 'allocate' && (
            <View style={styles.allocateTotalRow}>
              <Text style={styles.allocateTotalLabel}>Total Buy Amount:</Text>
              <View style={styles.allocateTotalInputWrapper}>
                <Text style={styles.allocateCurrencySymbol}>$</Text>
                <TextInput
                  style={styles.allocateTotalInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  value={state.allocateTotalAmount}
                  onChangeText={setAllocateTotalAmount}
                  onBlur={handleAllocateTotalBlur}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.itemsSection}>
          {/* Table Header */}
          {state.items.length > 0 && (
            <View style={styles.itemTableHeader}>
              <Text style={styles.itemTableHeaderQty}>Qty</Text>
              <Text style={styles.itemTableHeaderName}>Name / Condition</Text>
              <Text style={styles.itemTableHeaderPrice}>Sell</Text>
              <Text style={styles.itemTableHeaderCost}>Cost</Text>
              <Text style={styles.itemTableHeaderTotal}>Total</Text>
              <View style={styles.itemTableHeaderAction} />
            </View>
          )}

          {/* Items List */}
          {state.items.map(item => {
            const itemCostBasis = getItemCostBasis(item);
            const itemTotalCost = itemCostBasis * item.quantity;
            return (
              <View key={item.localId} style={styles.itemTableRow}>
                <Text style={styles.itemTableQty}>{item.quantity}</Text>
                <View style={styles.itemTableNameCol}>
                  <Text style={styles.itemTableName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemTableCondition}>
                    {CONDITION_OPTIONS.find(c => c.value === item.condition)?.label ||
                      item.condition}
                  </Text>
                </View>
                <Text style={styles.itemTableSell}>${item.sell_price.toFixed(2)}</Text>
                <Text
                  style={[
                    styles.itemTableCost,
                    state.costEntryMode === 'allocate' && styles.itemTableCostAuto,
                  ]}>
                  ${itemCostBasis.toFixed(2)}
                </Text>
                <Text style={styles.itemTableTotal}>${itemTotalCost.toFixed(2)}</Text>
                <View style={styles.itemTableActions}>
                  <TouchableOpacity
                    onPress={() => setActiveMenuId(activeMenuId === item.localId ? null : item.localId)}
                    style={styles.itemMenuBtn}>
                    <Icon source="dots-vertical" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  {activeMenuId === item.localId && (
                    <View style={styles.itemActionMenu}>
                      <TouchableOpacity
                        style={styles.itemActionMenuItem}
                        onPress={() => {
                          setActiveMenuId(null);
                          openEditItem(item);
                        }}>
                        <Icon source="pencil-outline" size={18} color={COLORS.purple} />
                        <Text style={styles.itemActionMenuText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.itemActionMenuItem, styles.itemActionMenuItemDanger]}
                        onPress={() => {
                          setActiveMenuId(null);
                          removeItem(item.localId);
                        }}>
                        <Icon source="trash-can-outline" size={18} color={COLORS.danger} />
                        <Text style={[styles.itemActionMenuText, styles.itemActionMenuTextDanger]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Empty State */}
          {state.items.length === 0 && (
            <View style={styles.noItemsContainer}>
              <Icon source="package-variant-closed" size={48} color={COLORS.textMuted} />
              <Text style={styles.noItemsText}>No items added yet</Text>
              <Text style={styles.noItemsSubtext}>
                Tap the button below to add items
              </Text>
            </View>
          )}

          {/* Add Item Button */}
          <TouchableOpacity
            style={styles.addItemButton}
            onPress={() => setItemModalVisible(true)}>
            <Icon source="plus" size={20} color={COLORS.green} />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        {state.items.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Sell Value:</Text>
              <Text style={styles.summaryValueGreen}>${totalSellValue.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Buy Amount:</Text>
              <Text style={styles.summaryValue}>${totalBuyAmount.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <WizardFooter
          onBack={handleBack}
          onNext={handleNext}
          isNextDisabled={state.items.length === 0}
        />
      </ScrollView>

      {/* Add Item Modal */}
      <DraggableBottomSheet
        visible={itemModalVisible}
        onClose={closeItemModal}
        title={editingItem ? 'Edit Item' : 'Add Item'}
        minHeight="80%"
        maxHeight="85%"
        avoidKeyboard>
        <ScrollView
          style={styles.modalScrollView}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Item Name Section */}
          <View style={styles.modalSection}>
            <View style={styles.modalSectionHeader}>
              <Icon source="package-variant" size={18} color={COLORS.purple} />
              <Text style={styles.modalSectionTitle}>Item Details</Text>
            </View>
            <View style={styles.inputWithIcon}>
              <Icon source="tag-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.inputWithIconField}
                placeholder="Enter item name"
                placeholderTextColor={COLORS.textMuted}
                value={itemName}
                onChangeText={setItemName}
                autoFocus
              />
            </View>
          </View>

          {/* Quantity Section */}
          <View style={styles.modalSection}>
            <Text style={styles.modalInputLabel}>Quantity</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => {
                  const q = Math.max(1, (parseInt(itemQuantity) || 1) - 1);
                  setItemQuantity(q.toString());
                }}>
                <Icon source="minus" size={20} color={COLORS.white} />
              </TouchableOpacity>
              <View style={styles.quantityInputWrapper}>
                <TextInput
                  style={styles.quantityInput}
                  value={itemQuantity}
                  onChangeText={setItemQuantity}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>
              <TouchableOpacity
                style={[styles.quantityBtn, styles.quantityBtnPlus]}
                onPress={() => {
                  const q = (parseInt(itemQuantity) || 0) + 1;
                  setItemQuantity(q.toString());
                }}>
                <Icon source="plus" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Condition Section */}
          <View style={styles.modalSection}>
            <Text style={styles.modalInputLabel}>Condition</Text>
            <View style={styles.conditionGrid}>
              {CONDITION_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.conditionChip,
                    itemCondition === opt.value && styles.conditionChipActive,
                  ]}
                  onPress={() => setItemCondition(opt.value)}>
                  <Text
                    style={[
                      styles.conditionChipText,
                      itemCondition === opt.value && styles.conditionChipTextActive,
                    ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pricing Section */}
          <View style={styles.modalSection}>
            <View style={styles.modalSectionHeader}>
              <Icon source="currency-usd" size={18} color={COLORS.green} />
              <Text style={styles.modalSectionTitle}>Pricing</Text>
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceInputCol}>
                <Text style={styles.priceLabel}>Sell Price *</Text>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.currencyPrefix}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textMuted}
                    value={itemSellPrice}
                    onChangeText={setItemSellPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.priceInputCol}>
                <Text style={styles.priceLabel}>Cost Basis</Text>
                {state.costEntryMode === 'allocate' ? (
                  <View style={styles.autoCostBox}>
                    <Icon source="calculator-variant" size={16} color={COLORS.purple} />
                    <View style={styles.autoCostContent}>
                      <Text style={styles.autoCostLabel}>Auto</Text>
                      <Text style={styles.autoCostSubtext}>From total</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.priceInputWrapper, styles.priceInputWrapperCost]}>
                    <Text style={[styles.currencyPrefix, styles.currencyPrefixCost]}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textMuted}
                      value={itemCost}
                      onChangeText={setItemCost}
                      keyboardType="decimal-pad"
                    />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.modalSaveBtn, isSavingItem && styles.modalSaveBtnDisabled]}
            onPress={handleSaveItem}
            disabled={isSavingItem}>
            {isSavingItem ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Icon
                source={editingItem ? 'check-circle' : 'plus-circle'}
                size={22}
                color={COLORS.white}
              />
            )}
            <Text style={styles.modalSaveBtnText}>
              {isSavingItem ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
  backButton: {
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: 80, // Account for tab bar
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  // Cost Mode Section
  costModeSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  costModeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  costModeToggle: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  costModeBtn: {
    flex: 1,
    flexBasis: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.inputBg,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 110,
  },
  costModeBtnActive: {
    backgroundColor: COLORS.purple + '15',
    borderColor: COLORS.purple,
  },
  costModeIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  costModeIconWrapperActive: {
    backgroundColor: COLORS.purple,
  },
  costModeBtnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  costModeBtnTitleActive: {
    color: COLORS.white,
  },
  costModeBtnSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  allocateTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  allocateTotalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  allocateTotalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.purple,
  },
  allocateCurrencySymbol: {
    fontSize: 16,
    color: COLORS.purple,
    fontWeight: '600',
  },
  allocateTotalInput: {
    width: 100,
    padding: SPACING.sm,
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'right',
    fontWeight: '600',
  },
  // Items Section
  itemsSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  itemTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.inputBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemTableHeaderQty: {
    width: 28,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'left',
  },
  itemTableHeaderName: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  itemTableHeaderPrice: {
    width: 52,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'left',
  },
  itemTableHeaderCost: {
    width: 52,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'left',
  },
  itemTableHeaderTotal: {
    width: 52,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'left',
  },
  itemTableHeaderAction: {
    width: 36,
  },
  itemTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemTableQty: {
    width: 28,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'left',
  },
  itemTableNameCol: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  itemTableName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.white,
  },
  itemTableCondition: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  itemTableSell: {
    width: 52,
    fontSize: 11,
    color: COLORS.green,
    textAlign: 'left',
  },
  itemTableCost: {
    width: 52,
    fontSize: 11,
    color: COLORS.orange,
    textAlign: 'left',
  },
  itemTableCostAuto: {
    color: COLORS.purple,
    fontStyle: 'italic',
  },
  itemTableTotal: {
    width: 52,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'left',
  },
  itemTableActions: {
    width: 36,
    alignItems: 'flex-end',
    position: 'relative',
  },
  itemMenuBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActionMenu: {
    position: 'absolute',
    top: 36,
    right: 0,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.xs,
    minWidth: 120,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  itemActionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  itemActionMenuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemActionMenuText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  itemActionMenuTextDanger: {
    color: COLORS.danger,
  },
  noItemsContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  noItemsText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  noItemsSubtext: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.green,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
    margin: SPACING.md,
    backgroundColor: COLORS.green + '10',
  },
  addItemText: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '600',
  },
  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.purple + '15',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
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
  summaryValueGreen: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green,
  },
  // Modal Styles
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  modalSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  inputWithIconField: {
    flex: 1,
    paddingVertical: SPACING.md,
    color: COLORS.white,
    fontSize: 16,
  },
  // Quantity Styles
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  quantityBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityBtnPlus: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  quantityInputWrapper: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityInput: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  // Condition Grid
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  conditionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  conditionChipActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  conditionChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  conditionChipTextActive: {
    color: COLORS.white,
  },
  // Pricing Styles
  priceRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  priceInputCol: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.green + '50',
  },
  priceInputWrapperCost: {
    borderColor: COLORS.orange + '50',
  },
  currencyPrefix: {
    paddingLeft: SPACING.md,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.green,
  },
  currencyPrefixCost: {
    color: COLORS.orange,
  },
  priceInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    paddingRight: SPACING.md,
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '500',
  },
  autoCostBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple + '15',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.purple + '40',
    gap: SPACING.sm,
  },
  autoCostContent: {
    flex: 1,
  },
  autoCostLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.purple,
  },
  autoCostSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  // Save Button
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  modalSaveBtnDisabled: {
    opacity: 0.7,
  },
  modalSaveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Step3ItemsScreen;
