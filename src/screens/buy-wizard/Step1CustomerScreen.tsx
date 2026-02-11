import React, {useState, useCallback, useEffect} from 'react';
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
import {useNavigation, useRoute, RouteProp, CommonActions} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {COLORS, SPACING, RADIUS, SHADOWS} from '@constants/theme';
import {searchCustomers, CustomerSearchResult} from '@services/customerService';
import {getBuyById} from '@services/buyService';
import {useBuyWizard, LocalBuyItem, LocalPayment} from '@contexts/BuyWizardContext';
import {StepIndicator, WizardFooter} from '@components/buy-wizard';
import DraggableBottomSheet from '@components/DraggableBottomSheet';
import {BuyWizardStackParamList} from '@types';

type NavigationProp = NativeStackNavigationProp<BuyWizardStackParamList, 'Step1Customer'>;
type Step1RouteProp = RouteProp<BuyWizardStackParamList, 'Step1Customer'>;

const STEP_LABELS = ['Customer', 'Payment', 'Items', 'Review', 'Complete'];

const Step1CustomerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<Step1RouteProp>();
  const {state, dispatch, createDraft, saveCustomer, saveAsDraft} = useBuyWizard();
  const buyId = route.params?.buyId;
  const [isLoadingBuy, setIsLoadingBuy] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  // Initialize buy on mount
  useEffect(() => {
    const initBuy = async () => {
      // If editing a different buy than what's in context, reset first
      if (buyId && state.buyId && state.buyId !== buyId) {
        dispatch({type: 'RESET'});
      }

      if (buyId) {
        // Edit mode - load existing buy
        if (!state.isEditing || state.buyId !== buyId) {
          loadExistingBuy(buyId);
        }
      } else if (!state.buyId) {
        // New buy mode - create draft
        setIsCreatingDraft(true);
        const success = await createDraft();
        setIsCreatingDraft(false);
        if (!success) {
          navigation.goBack();
        }
      }
    };
    initBuy();
  }, [buyId]);

  const loadExistingBuy = async (id: number) => {
    setIsLoadingBuy(true);
    const buy = await getBuyById(id);
    if (buy) {
      // Set buy info
      dispatch({
        type: 'SET_BUY_INFO',
        payload: {
          buyId: buy.id,
          buyNumber: buy.buy_number,
          status: buy.status,
        },
      });

      // Set editing state
      dispatch({type: 'SET_EXISTING_BUY', payload: {buyId: id, isEditing: true}});

      // Set customer
      if (buy.customer) {
        dispatch({
          type: 'SET_CUSTOMER',
          payload: {
            id: buy.customer.id,
            name: buy.customer.name,
            email: buy.customer.email,
            phone: buy.customer.phone,
            allow_points: true,
            allow_store_credit: true,
          },
        });
      }

      // Set items with server IDs
      const items: LocalBuyItem[] = buy.items.map(item => ({
        localId: `existing-${item.id}`,
        serverId: item.id,
        name: item.name,
        quantity: item.quantity,
        condition: item.condition,
        sell_price: item.sell_price,
        cost_basis: item.cost_basis,
        sku: item.sku,
      }));
      dispatch({type: 'SET_ITEMS', payload: items});

      // Set cost entry mode
      dispatch({type: 'SET_COST_ENTRY_MODE', payload: buy.cost_entry_mode});

      // Set allocate total amount if in allocate mode
      if (buy.cost_entry_mode === 'allocate' && buy.total_buy_amount > 0) {
        dispatch({type: 'SET_ALLOCATE_TOTAL', payload: buy.total_buy_amount.toString()});
      }

      // Set payments
      const payments: LocalPayment[] = buy.payments.map(payment => ({
        localId: `existing-${payment.id}`,
        payment_method_id: payment.payment_method_id,
        payment_method_name: payment.payment_method_name,
        amount: payment.amount,
      }));
      dispatch({type: 'SET_PAYMENTS', payload: payments});

      // Set notes
      if (buy.notes) {
        dispatch({type: 'SET_NOTES', payload: buy.notes});
      }
    }
    setIsLoadingBuy(false);
  };

  // Customer search modal
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // New customer modal
  const [newCustomerModalVisible, setNewCustomerModalVisible] = useState(false);
  const [newCustomerFirstName, setNewCustomerFirstName] = useState('');
  const [newCustomerLastName, setNewCustomerLastName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Search customers
  const handleCustomerSearch = useCallback(async (query: string) => {
    setCustomerSearch(query);
    if (query.length < 2) {
      setCustomerResults([]);
      return;
    }
    setIsSearchingCustomer(true);
    const results = await searchCustomers(query);
    setCustomerResults(results);
    setIsSearchingCustomer(false);
  }, []);

  // Select customer
  const handleSelectCustomer = async (customer: CustomerSearchResult) => {
    dispatch({type: 'SET_CUSTOMER', payload: customer});
    setCustomerModalVisible(false);
    setCustomerSearch('');
    setCustomerResults([]);

    // Auto-save customer to server
    if (state.buyId) {
      await saveCustomer(customer.id);
    }
  };

  // Remove customer
  const handleRemoveCustomer = async () => {
    if (state.customer) {
      dispatch({type: 'SET_CUSTOMER', payload: null});
    } else if (state.newCustomer) {
      dispatch({type: 'SET_NEW_CUSTOMER', payload: null});
    }

    // Auto-save (remove customer from server)
    if (state.buyId) {
      await saveCustomer(null);
    }
  };

  // Get customer display info
  const getCustomerDisplayInfo = () => {
    if (state.customer) {
      return {
        name: state.customer.name,
        email: state.customer.email,
        phone: state.customer.phone,
        isNew: false,
      };
    }
    if (state.newCustomer) {
      return {
        name: `${state.newCustomer.firstName} ${state.newCustomer.lastName}`,
        email: state.newCustomer.email,
        phone: state.newCustomer.phone,
        isNew: true,
      };
    }
    return null;
  };

  const customerInfo = getCustomerDisplayInfo();

  // Open new customer modal
  const openNewCustomerModal = () => {
    setCustomerModalVisible(false);
    setNewCustomerModalVisible(true);
  };

  // Close new customer modal
  const closeNewCustomerModal = () => {
    setNewCustomerModalVisible(false);
    setNewCustomerFirstName('');
    setNewCustomerLastName('');
    setNewCustomerEmail('');
    setNewCustomerPhone('');
  };

  // Add new customer
  const handleAddNewCustomer = () => {
    if (!newCustomerFirstName.trim() || !newCustomerLastName.trim()) {
      Toast.show({type: 'error', text1: 'First name and last name are required'});
      return;
    }
    if (!newCustomerEmail.trim()) {
      Toast.show({type: 'error', text1: 'Email is required'});
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCustomerEmail.trim())) {
      Toast.show({type: 'error', text1: 'Please enter a valid email address'});
      return;
    }

    dispatch({
      type: 'SET_NEW_CUSTOMER',
      payload: {
        firstName: newCustomerFirstName.trim(),
        lastName: newCustomerLastName.trim(),
        email: newCustomerEmail.trim(),
        phone: newCustomerPhone.trim(),
      },
    });
    closeNewCustomerModal();
    Toast.show({type: 'success', text1: 'Customer added'});
  };

  // Check if customer is selected
  const hasCustomer = state.customer !== null || state.newCustomer !== null;

  // Navigate to next step
  const handleNext = () => {
    if (!hasCustomer) {
      Toast.show({type: 'error', text1: 'Please select or add a customer'});
      return;
    }
    navigation.navigate('Step2Payment');
  };

  // Handle save draft and exit
  const handleSaveDraft = async () => {
    const success = await saveAsDraft();
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

  // Go back / Cancel
  const handleBack = () => {
    // If we have a draft, ask if they want to save or discard
    if (state.buyId) {
      // For now, just save and go back
      handleSaveDraft();
    } else {
      dispatch({type: 'RESET'});
      navigation.goBack();
    }
  };

  // Get header title
  const getHeaderTitle = () => {
    if (state.buyNumber) {
      return state.buyNumber;
    }
    return state.isEditing ? 'Edit Buy' : 'New Buy';
  };

  // Get status badge
  const getStatusBadge = () => {
    if (!state.status) return null;
    const statusColors: Record<string, string> = {
      draft: COLORS.orange,
      pending: COLORS.purple,
      completed: COLORS.green,
    };
    return (
      <View style={[styles.statusBadge, {backgroundColor: statusColors[state.status] + '20'}]}>
        <Text style={[styles.statusBadgeText, {color: statusColors[state.status]}]}>
          {state.status.charAt(0).toUpperCase() + state.status.slice(1)}
        </Text>
      </View>
    );
  };

  const isLoading = isLoadingBuy || isCreatingDraft;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleBack}>
          <Icon source="close" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          {getStatusBadge()}
        </View>
        {state.buyId && (
          <TouchableOpacity style={styles.saveDraftButton} onPress={handleSaveDraft}>
            <Icon source="content-save-outline" size={20} color={COLORS.purple} />
          </TouchableOpacity>
        )}
        {!state.buyId && <View style={styles.headerSpacer} />}
      </View>

      {/* Auto-save indicator */}
      {state.isSaving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={COLORS.purple} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
      {state.lastSavedAt && !state.isSaving && (
        <View style={styles.savedIndicator}>
          <Icon source="check-circle" size={14} color={COLORS.green} />
          <Text style={styles.savedText}>Auto-saved</Text>
        </View>
      )}

      {/* Step Indicator */}
      <StepIndicator currentStep={1} totalSteps={5} labels={STEP_LABELS} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>
            {isCreatingDraft ? 'Creating draft...' : 'Loading buy data...'}
          </Text>
        </View>
      ) : (
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Select Customer</Text>
        <Text style={styles.subtitle}>
          Choose an existing customer or create a new one for this buy transaction.
        </Text>

        {/* Selected Customer Card */}
        {customerInfo ? (
          <View style={styles.selectedCustomerCard}>
            {customerInfo.isNew && (
              <View style={styles.newCustomerBadge}>
                <Text style={styles.newCustomerBadgeText}>New Customer</Text>
              </View>
            )}
            <View style={styles.customerHeader}>
              <View style={styles.customerAvatar}>
                <Icon source="account" size={28} color={COLORS.white} />
              </View>
              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>{customerInfo.name}</Text>
                <Text style={styles.customerEmail}>{customerInfo.email}</Text>
                {customerInfo.phone && (
                  <Text style={styles.customerPhone}>{customerInfo.phone}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeCustomerButton}
                onPress={handleRemoveCustomer}>
                <Icon source="close" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.changeCustomerButton}
              onPress={() => setCustomerModalVisible(true)}>
              <Text style={styles.changeCustomerText}>Change Customer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Select Customer Card */}
            <TouchableOpacity
              style={styles.selectCustomerCard}
              onPress={() => setCustomerModalVisible(true)}
              activeOpacity={0.8}>
              <View style={styles.selectCustomerIcon}>
                <Icon source="account-search" size={28} color={COLORS.white} />
              </View>
              <View style={styles.selectCustomerContent}>
                <Text style={styles.selectCustomerTitle}>Search Existing Customer</Text>
                <Text style={styles.selectCustomerSubtitle}>
                  Find by name, email, or phone
                </Text>
              </View>
              <Icon source="chevron-right" size={24} color={COLORS.white} />
            </TouchableOpacity>

            {/* Add New Customer Card */}
            <TouchableOpacity
              style={styles.addNewCustomerCard}
              onPress={openNewCustomerModal}
              activeOpacity={0.8}>
              <View style={styles.addNewCustomerIcon}>
                <Icon source="account-plus" size={28} color={COLORS.white} />
              </View>
              <View style={styles.addNewCustomerContent}>
                <Text style={styles.addNewCustomerTitle}>Add New Customer</Text>
                <Text style={styles.addNewCustomerSubtitle}>
                  Create a new customer profile
                </Text>
              </View>
              <Icon source="chevron-right" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </>
        )}

        {/* Footer */}
        <WizardFooter
          onBack={handleBack}
          onNext={handleNext}
          showBack={true}
          backLabel="Cancel"
          isNextDisabled={!hasCustomer}
        />
      </ScrollView>
      )}

      {/* Customer Search Modal */}
      <DraggableBottomSheet
        visible={customerModalVisible}
        onClose={() => setCustomerModalVisible(false)}
        title="Select Customer"
        maxHeight="80%">
        <View style={styles.modalContent}>
          <View style={styles.searchWrapper}>
            <Icon source="magnify" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, or phone..."
              placeholderTextColor={COLORS.textMuted}
              value={customerSearch}
              onChangeText={handleCustomerSearch}
              autoFocus
            />
          </View>

          {/* Search Results */}
          {isSearchingCustomer ? (
            <ActivityIndicator style={styles.loader} color={COLORS.purple} />
          ) : (
            <ScrollView style={styles.resultsList}>
              {customerResults.map(customer => (
                <TouchableOpacity
                  key={customer.id}
                  style={styles.customerResultItem}
                  onPress={() => handleSelectCustomer(customer)}>
                  <Icon source="account" size={20} color={COLORS.purple} />
                  <View style={styles.customerResultDetails}>
                    <Text style={styles.customerResultName}>{customer.name}</Text>
                    <Text style={styles.customerResultEmail}>{customer.email}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </DraggableBottomSheet>

      {/* Add New Customer Modal */}
      <DraggableBottomSheet
        visible={newCustomerModalVisible}
        onClose={closeNewCustomerModal}
        title="Add New Customer"
        minHeight="70%"
        maxHeight="70%"
        avoidKeyboard>
        <ScrollView
          style={styles.newCustomerScrollView}
          contentContainerStyle={styles.newCustomerScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.rowInputs}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>First Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="John"
                placeholderTextColor={COLORS.textMuted}
                value={newCustomerFirstName}
                onChangeText={setNewCustomerFirstName}
                autoFocus
              />
            </View>
            <View style={[styles.inputHalf, {marginLeft: 12}]}>
              <Text style={styles.inputLabel}>Last Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Smith"
                placeholderTextColor={COLORS.textMuted}
                value={newCustomerLastName}
                onChangeText={setNewCustomerLastName}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Email *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="john.smith@email.com"
            placeholderTextColor={COLORS.textMuted}
            value={newCustomerEmail}
            onChangeText={setNewCustomerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Phone</Text>
          <TextInput
            style={styles.textInput}
            placeholder="(555) 123-4567"
            placeholderTextColor={COLORS.textMuted}
            value={newCustomerPhone}
            onChangeText={setNewCustomerPhone}
            keyboardType="phone-pad"
          />

          <View style={styles.newCustomerActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeNewCustomerModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addCustomerButton}
              onPress={handleAddNewCustomer}>
              <Text style={styles.addCustomerButtonText}>Add Customer</Text>
            </TouchableOpacity>
          </View>
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
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerSpacer: {
    width: 40,
  },
  saveDraftButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple + '20',
    borderRadius: RADIUS.md,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  savingText: {
    fontSize: 12,
    color: COLORS.purple,
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  savedText: {
    fontSize: 12,
    color: COLORS.green,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: 80,
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
    marginBottom: SPACING.lg,
  },
  // Selected Customer Card
  selectedCustomerCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.green,
  },
  newCustomerBadge: {
    backgroundColor: COLORS.purple + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  newCustomerBadgeText: {
    fontSize: 11,
    color: COLORS.purple,
    fontWeight: '600',
  },
  customerHeader: {
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
  customerDetails: {
    flex: 1,
    marginLeft: SPACING.md,
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
    color: COLORS.textMuted,
    marginTop: 2,
  },
  removeCustomerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeCustomerButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  changeCustomerText: {
    fontSize: 14,
    color: COLORS.purple,
    fontWeight: '500',
  },
  // Select Customer Card
  selectCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.greenGlow,
  },
  selectCustomerIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCustomerContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  selectCustomerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  selectCustomerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  // Add New Customer Card
  addNewCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  addNewCustomerIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewCustomerContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  addNewCustomerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  addNewCustomerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  // Modal Styles
  modalContent: {
    padding: SPACING.md,
    flex: 1,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
  },
  loader: {
    marginTop: SPACING.lg,
  },
  resultsList: {
    marginTop: SPACING.md,
  },
  customerResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  customerResultDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  customerResultName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.white,
  },
  customerResultEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // New Customer Form
  newCustomerScrollView: {
    flex: 1,
  },
  newCustomerScrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  textInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.white,
    fontSize: 15,
  },
  newCustomerActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  addCustomerButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
  },
  addCustomerButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Step1CustomerScreen;
