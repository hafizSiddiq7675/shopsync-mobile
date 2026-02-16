import React, {createContext, useContext, useReducer, ReactNode, useCallback} from 'react';
import {CostEntryMode, ItemCondition} from '@types';
import {CustomerSearchResult} from '@services/customerService';
import {
  createBuy,
  updateBuy,
  addBuyItem,
  updateBuyItem,
  deleteBuyItem,
  updateBuyPayments,
  saveBuyAsPending,
  completeBuy,
  saveNewCustomerToDraft,
  BuyItemPayload,
  BuyPaymentPayload,
  NewCustomerPayload,
} from '@services/buyService';
import Toast from 'react-native-toast-message';

// Types
export interface LocalBuyItem {
  localId: string;
  serverId?: number; // Server ID for updates/deletes
  name: string;
  quantity: number;
  condition: ItemCondition;
  sell_price: number;
  cost_basis: number;
  sku?: string;
}

export interface LocalPayment {
  localId: string;
  payment_method_id: number;
  payment_method_name?: string;
  amount: number;
}

export interface NewCustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface BuyWizardState {
  // Buy identification
  buyId: number | null;
  buyNumber: string | null;
  status: 'draft' | 'pending' | 'completed' | null;

  // Step 1: Customer
  customer: CustomerSearchResult | null;
  newCustomer: NewCustomerData | null;

  // Step 2: Items
  items: LocalBuyItem[];
  costEntryMode: CostEntryMode;
  allocateTotalAmount: string;

  // Step 3: Payment
  payments: LocalPayment[];

  // Step 4: Review
  createdBy: string;
  notes: string;

  // State flags
  isEditing: boolean;
  isLoading: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
}

// Action types
type BuyWizardAction =
  | {type: 'SET_BUY_INFO'; payload: {buyId: number; buyNumber: string; status?: string}}
  | {type: 'SET_CUSTOMER'; payload: CustomerSearchResult | null}
  | {type: 'SET_NEW_CUSTOMER'; payload: NewCustomerData | null}
  | {type: 'ADD_ITEM'; payload: LocalBuyItem}
  | {type: 'UPDATE_ITEM'; payload: LocalBuyItem}
  | {type: 'REMOVE_ITEM'; payload: string}
  | {type: 'SET_ITEMS'; payload: LocalBuyItem[]}
  | {type: 'SET_ITEM_SERVER_ID'; payload: {localId: string; serverId: number}}
  | {type: 'SET_COST_ENTRY_MODE'; payload: CostEntryMode}
  | {type: 'SET_ALLOCATE_TOTAL'; payload: string}
  | {type: 'ADD_PAYMENT'; payload: LocalPayment}
  | {type: 'UPDATE_PAYMENT'; payload: LocalPayment}
  | {type: 'REMOVE_PAYMENT'; payload: string}
  | {type: 'SET_PAYMENTS'; payload: LocalPayment[]}
  | {type: 'SET_CREATED_BY'; payload: string}
  | {type: 'SET_NOTES'; payload: string}
  | {type: 'SET_EXISTING_BUY'; payload: {buyId: number; isEditing: boolean}}
  | {type: 'SET_LOADING'; payload: boolean}
  | {type: 'SET_SAVING'; payload: boolean}
  | {type: 'SET_LAST_SAVED'; payload: Date}
  | {type: 'SET_STATUS'; payload: 'draft' | 'pending' | 'completed'}
  | {type: 'RESET'};

// Initial state
const initialState: BuyWizardState = {
  buyId: null,
  buyNumber: null,
  status: null,
  customer: null,
  newCustomer: null,
  items: [],
  costEntryMode: 'manual',
  allocateTotalAmount: '',
  payments: [],
  createdBy: '',
  notes: '',
  isEditing: false,
  isLoading: false,
  isSaving: false,
  lastSavedAt: null,
};

// Reducer
function buyWizardReducer(state: BuyWizardState, action: BuyWizardAction): BuyWizardState {
  switch (action.type) {
    case 'SET_BUY_INFO':
      return {
        ...state,
        buyId: action.payload.buyId,
        buyNumber: action.payload.buyNumber,
        status: (action.payload.status as any) || 'draft',
      };
    case 'SET_CUSTOMER':
      return {...state, customer: action.payload, newCustomer: null};
    case 'SET_NEW_CUSTOMER':
      return {...state, newCustomer: action.payload, customer: null};
    case 'ADD_ITEM':
      return {...state, items: [...state.items, action.payload]};
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.localId === action.payload.localId ? action.payload : item
        ),
      };
    case 'REMOVE_ITEM':
      return {...state, items: state.items.filter(item => item.localId !== action.payload)};
    case 'SET_ITEMS':
      return {...state, items: action.payload};
    case 'SET_ITEM_SERVER_ID':
      return {
        ...state,
        items: state.items.map(item =>
          item.localId === action.payload.localId
            ? {...item, serverId: action.payload.serverId}
            : item
        ),
      };
    case 'SET_COST_ENTRY_MODE':
      return {...state, costEntryMode: action.payload};
    case 'SET_ALLOCATE_TOTAL':
      return {...state, allocateTotalAmount: action.payload};
    case 'ADD_PAYMENT':
      return {...state, payments: [...state.payments, action.payload]};
    case 'UPDATE_PAYMENT':
      return {
        ...state,
        payments: state.payments.map(p =>
          p.localId === action.payload.localId ? action.payload : p
        ),
      };
    case 'REMOVE_PAYMENT':
      return {...state, payments: state.payments.filter(p => p.localId !== action.payload)};
    case 'SET_PAYMENTS':
      return {...state, payments: action.payload};
    case 'SET_CREATED_BY':
      return {...state, createdBy: action.payload};
    case 'SET_NOTES':
      return {...state, notes: action.payload};
    case 'SET_EXISTING_BUY':
      return {...state, buyId: action.payload.buyId, isEditing: action.payload.isEditing};
    case 'SET_LOADING':
      return {...state, isLoading: action.payload};
    case 'SET_SAVING':
      return {...state, isSaving: action.payload};
    case 'SET_LAST_SAVED':
      return {...state, lastSavedAt: action.payload};
    case 'SET_STATUS':
      return {...state, status: action.payload};
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// Context
interface BuyWizardContextType {
  state: BuyWizardState;
  dispatch: React.Dispatch<BuyWizardAction>;
  // Computed values
  totalSellValue: number;
  totalBuyAmount: number;
  profit: number;
  totalPayments: number;
  remainingAmount: number;
  getItemCostBasis: (item: LocalBuyItem) => number;
  // API functions
  createDraft: () => Promise<boolean>;
  saveCustomer: (customerId: number | null) => Promise<boolean>;
  saveCostMode: (mode: CostEntryMode, totalAmount?: number) => Promise<boolean>;
  saveNotes: (notes: string) => Promise<boolean>;
  addItemToServer: (item: LocalBuyItem) => Promise<{success: boolean; serverId?: number}>;
  updateItemOnServer: (item: LocalBuyItem) => Promise<boolean>;
  deleteItemFromServer: (item: LocalBuyItem) => Promise<boolean>;
  savePayments: (payments: LocalPayment[]) => Promise<boolean>;
  saveAsDraft: () => Promise<boolean>;
  saveAsPending: () => Promise<boolean>;
  completeBuyTransaction: () => Promise<boolean>;
}

const BuyWizardContext = createContext<BuyWizardContextType | undefined>(undefined);

// Provider
interface BuyWizardProviderProps {
  children: ReactNode;
}

export const BuyWizardProvider: React.FC<BuyWizardProviderProps> = ({children}) => {
  const [state, dispatch] = useReducer(buyWizardReducer, initialState);

  // Computed values
  const totalSellValue = state.items.reduce(
    (sum, item) => sum + item.sell_price * item.quantity,
    0
  );

  const allocateAmount = parseFloat(state.allocateTotalAmount) || 0;

  const getItemCostBasis = (item: LocalBuyItem): number => {
    if (state.costEntryMode === 'allocate' && totalSellValue > 0) {
      const itemSellValue = item.sell_price * item.quantity;
      const proportion = itemSellValue / totalSellValue;
      return (proportion * allocateAmount) / item.quantity;
    }
    return item.cost_basis;
  };

  const totalBuyAmount =
    state.costEntryMode === 'allocate'
      ? allocateAmount
      : state.items.reduce((sum, item) => sum + item.cost_basis * item.quantity, 0);

  const profit = totalSellValue - totalBuyAmount;
  const totalPayments = state.payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = totalBuyAmount - totalPayments;

  // API Functions

  // Create draft buy
  const createDraft = useCallback(async (): Promise<boolean> => {
    if (state.buyId) return true; // Already has a buy ID

    dispatch({type: 'SET_LOADING', payload: true});
    try {
      const result = await createBuy({});
      if (result.success && result.data) {
        dispatch({
          type: 'SET_BUY_INFO',
          payload: {
            buyId: result.data.id,
            buyNumber: result.data.buy_number,
            status: result.data.status,
          },
        });
        dispatch({type: 'SET_LAST_SAVED', payload: new Date()});
        return true;
      }
      Toast.show({type: 'error', text1: result.message || 'Failed to create draft'});
      return false;
    } catch (error) {
      Toast.show({type: 'error', text1: 'Failed to create draft'});
      return false;
    } finally {
      dispatch({type: 'SET_LOADING', payload: false});
    }
  }, [state.buyId]);

  // Save customer selection
  const saveCustomer = useCallback(async (customerId: number | null): Promise<boolean> => {
    if (!state.buyId) return false;

    dispatch({type: 'SET_SAVING', payload: true});
    try {
      const result = await updateBuy(state.buyId, {customer_id: customerId ?? undefined});
      if (result.success) {
        dispatch({type: 'SET_LAST_SAVED', payload: new Date()});
        return true;
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      dispatch({type: 'SET_SAVING', payload: false});
    }
  }, [state.buyId]);

  // Save cost entry mode
  const saveCostMode = useCallback(async (mode: CostEntryMode, totalAmount?: number): Promise<boolean> => {
    if (!state.buyId) return false;

    dispatch({type: 'SET_SAVING', payload: true});
    try {
      const result = await updateBuy(state.buyId, {
        cost_entry_mode: mode,
        total_buy_amount: totalAmount,
      });
      if (result.success) {
        dispatch({type: 'SET_LAST_SAVED', payload: new Date()});
        return true;
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      dispatch({type: 'SET_SAVING', payload: false});
    }
  }, [state.buyId]);

  // Save notes
  const saveNotes = useCallback(async (notes: string): Promise<boolean> => {
    if (!state.buyId) return false;

    dispatch({type: 'SET_SAVING', payload: true});
    try {
      const result = await updateBuy(state.buyId, {notes});
      if (result.success) {
        dispatch({type: 'SET_LAST_SAVED', payload: new Date()});
        return true;
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      dispatch({type: 'SET_SAVING', payload: false});
    }
  }, [state.buyId]);

  // Add item to server
  const addItemToServer = useCallback(async (item: LocalBuyItem): Promise<{success: boolean; serverId?: number}> => {
    if (!state.buyId) return {success: false};

    dispatch({type: 'SET_SAVING', payload: true});
    try {
      const payload: BuyItemPayload = {
        name: item.name,
        quantity: item.quantity,
        condition: item.condition,
        sell_price: item.sell_price,
        cost_basis: item.cost_basis,
        sku: item.sku,
      };
      const result = await addBuyItem(state.buyId, payload);
      if (result.success && result.data?.item) {
        dispatch({type: 'SET_LAST_SAVED', payload: new Date()});
        return {success: true, serverId: result.data.item.id};
      }
      Toast.show({type: 'error', text1: result.message || 'Failed to add item'});
      return {success: false};
    } catch (error) {
      Toast.show({type: 'error', text1: 'Failed to add item'});
      return {success: false};
    } finally {
      dispatch({type: 'SET_SAVING', payload: false});
    }
  }, [state.buyId]);

  // Update item on server
  const updateItemOnServer = useCallback(async (item: LocalBuyItem): Promise<boolean> => {
    if (!state.buyId || !item.serverId) return false;

    dispatch({type: 'SET_SAVING', payload: true});
    try {
      const payload: Partial<BuyItemPayload> = {
        name: item.name,
        quantity: item.quantity,
        condition: item.condition,
        sell_price: item.sell_price,
        cost_basis: item.cost_basis,
        sku: item.sku,
      };
      const result = await updateBuyItem(state.buyId, item.serverId, payload);
      if (result.success) {
        dispatch({type: 'SET_LAST_SAVED', payload: new Date()});
        return true;
      }
      Toast.show({type: 'error', text1: result.message || 'Failed to update item'});
      return false;
    } catch (error) {
      Toast.show({type: 'error', text1: 'Failed to update item'});
      return false;
    } finally {
      dispatch({type: 'SET_SAVING', payload: false});
    }
  }, [state.buyId]);

  // Delete item from server
  const deleteItemFromServer = useCallback(async (item: LocalBuyItem): Promise<boolean> => {
    if (!state.buyId || !item.serverId) return true; // No server ID means not saved yet

    dispatch({type: 'SET_SAVING', payload: true});
    try {
      const result = await deleteBuyItem(state.buyId, item.serverId);
      if (result.success) {
        dispatch({type: 'SET_LAST_SAVED', payload: new Date()});
        return true;
      }
      Toast.show({type: 'error', text1: result.message || 'Failed to delete item'});
      return false;
    } catch (error) {
      Toast.show({type: 'error', text1: 'Failed to delete item'});
      return false;
    } finally {
      dispatch({type: 'SET_SAVING', payload: false});
    }
  }, [state.buyId]);

  // Save payments to server
  const savePayments = useCallback(async (payments: LocalPayment[]): Promise<boolean> => {
    if (!state.buyId) return false;

    dispatch({type: 'SET_SAVING', payload: true});
    try {
      const paymentPayloads: BuyPaymentPayload[] = payments.map(p => ({
        method_id: p.payment_method_id,
        amount: p.amount,
      }));
      const result = await updateBuyPayments(state.buyId, paymentPayloads);
      if (result.success) {
        dispatch({type: 'SET_LAST_SAVED', payload: new Date()});
        return true;
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      dispatch({type: 'SET_SAVING', payload: false});
    }
  }, [state.buyId]);

  // Save as draft (saves new customer if exists)
  const saveAsDraft = useCallback(async (): Promise<boolean> => {
    if (!state.buyId) return false;

    // Validate payments match buy amount (only if there are payments)
    if (state.payments.length > 0 && Math.abs(totalPayments - totalBuyAmount) > 0.01) {
      Toast.show({
        type: 'error',
        text1: 'Payment mismatch',
        text2: `Total payments ($${totalPayments.toFixed(2)}) must equal buy cost ($${totalBuyAmount.toFixed(2)})`,
      });
      return false;
    }

    // If there's a new customer, save them to the draft
    if (state.newCustomer) {
      dispatch({type: 'SET_SAVING', payload: true});
      try {
        const newCustomerPayload: NewCustomerPayload = {
          first_name: state.newCustomer.firstName,
          last_name: state.newCustomer.lastName,
          email: state.newCustomer.email,
          phone: state.newCustomer.phone || undefined,
        };
        const result = await saveNewCustomerToDraft(state.buyId, newCustomerPayload);
        if (!result.success) {
          Toast.show({type: 'error', text1: result.message || 'Failed to save customer'});
          return false;
        }
        dispatch({type: 'SET_LAST_SAVED', payload: new Date()});
      } catch (error) {
        Toast.show({type: 'error', text1: 'Failed to save draft'});
        return false;
      } finally {
        dispatch({type: 'SET_SAVING', payload: false});
      }
    }

    // Show appropriate message based on current status
    const statusMessages: Record<string, string> = {
      draft: 'Draft saved',
      pending: 'Changes saved',
      completed: 'Changes saved',
    };
    const message = statusMessages[state.status || 'draft'] || 'Changes saved';
    Toast.show({type: 'success', text1: message});
    return true;
  }, [state.buyId, state.newCustomer, state.payments.length, state.status, totalPayments, totalBuyAmount]);

  // Save as pending
  const saveAsPending = useCallback(async (): Promise<boolean> => {
    if (!state.buyId) return false;

    // Validate customer is selected
    if (!state.customer && !state.newCustomer) {
      Toast.show({type: 'error', text1: 'Customer is required for pending status'});
      return false;
    }

    // Validate payments match buy amount
    if (totalBuyAmount > 0 && Math.abs(totalPayments - totalBuyAmount) > 0.01) {
      Toast.show({
        type: 'error',
        text1: 'Payment mismatch',
        text2: `Total payments ($${totalPayments.toFixed(2)}) must equal buy cost ($${totalBuyAmount.toFixed(2)})`,
      });
      return false;
    }

    dispatch({type: 'SET_SAVING', payload: true});
    try {
      const payments: BuyPaymentPayload[] = state.payments.map(p => ({
        method_id: p.payment_method_id,
        amount: p.amount,
      }));

      // Calculate store credit amount if any
      const storeCreditPayment = state.payments.find(
        p => p.payment_method_name?.toLowerCase().includes('store credit')
      );
      const storeCreditAmount = storeCreditPayment?.amount || 0;

      // Prepare new customer data if exists
      const newCustomerPayload: NewCustomerPayload | undefined = state.newCustomer
        ? {
            first_name: state.newCustomer.firstName,
            last_name: state.newCustomer.lastName,
            email: state.newCustomer.email,
            phone: state.newCustomer.phone || undefined,
          }
        : undefined;

      const result = await saveBuyAsPending(state.buyId, payments, storeCreditAmount, newCustomerPayload);
      if (result.success) {
        dispatch({type: 'SET_STATUS', payload: 'pending'});
        dispatch({type: 'SET_LAST_SAVED', payload: new Date()});
        Toast.show({type: 'success', text1: 'Saved as pending'});
        return true;
      }
      Toast.show({type: 'error', text1: result.message || 'Failed to save as pending'});
      return false;
    } catch (error) {
      Toast.show({type: 'error', text1: 'Failed to save as pending'});
      return false;
    } finally {
      dispatch({type: 'SET_SAVING', payload: false});
    }
  }, [state.buyId, state.customer, state.newCustomer, state.payments, totalPayments, totalBuyAmount]);

  // Complete buy transaction
  const completeBuyTransaction = useCallback(async (): Promise<boolean> => {
    if (!state.buyId) return false;

    // Validations
    if (!state.customer && !state.newCustomer) {
      Toast.show({type: 'error', text1: 'Customer is required'});
      return false;
    }
    if (state.items.length === 0) {
      Toast.show({type: 'error', text1: 'At least one item is required'});
      return false;
    }
    if (totalBuyAmount > 0 && state.payments.length === 0) {
      Toast.show({type: 'error', text1: 'At least one payment is required'});
      return false;
    }
    if (!state.createdBy || state.createdBy.trim() === '') {
      Toast.show({type: 'error', text1: 'Created By name is required'});
      return false;
    }

    // Validate payments match buy amount
    if (totalBuyAmount > 0 && Math.abs(totalPayments - totalBuyAmount) > 0.01) {
      Toast.show({
        type: 'error',
        text1: 'Payment mismatch',
        text2: `Total payments ($${totalPayments.toFixed(2)}) must equal buy cost ($${totalBuyAmount.toFixed(2)})`,
      });
      return false;
    }

    dispatch({type: 'SET_SAVING', payload: true});
    try {
      const payments: BuyPaymentPayload[] = state.payments.map(p => ({
        method_id: p.payment_method_id,
        amount: p.amount,
      }));

      // Calculate store credit amount if any
      const storeCreditPayment = state.payments.find(
        p => p.payment_method_name?.toLowerCase().includes('store credit')
      );
      const storeCreditAmount = storeCreditPayment?.amount || 0;

      // Prepare new customer data if exists
      const newCustomerPayload: NewCustomerPayload | undefined = state.newCustomer
        ? {
            first_name: state.newCustomer.firstName,
            last_name: state.newCustomer.lastName,
            email: state.newCustomer.email,
            phone: state.newCustomer.phone || undefined,
          }
        : undefined;

      const result = await completeBuy(state.buyId, payments, storeCreditAmount, newCustomerPayload, state.createdBy);
      if (result.success) {
        dispatch({type: 'SET_STATUS', payload: 'completed'});
        dispatch({type: 'SET_LAST_SAVED', payload: new Date()});
        return true;
      }
      Toast.show({type: 'error', text1: result.message || 'Failed to complete buy'});
      return false;
    } catch (error) {
      Toast.show({type: 'error', text1: 'Failed to complete buy'});
      return false;
    } finally {
      dispatch({type: 'SET_SAVING', payload: false});
    }
  }, [state.buyId, state.customer, state.newCustomer, state.items, state.payments, state.createdBy, totalBuyAmount, totalPayments]);

  return (
    <BuyWizardContext.Provider
      value={{
        state,
        dispatch,
        totalSellValue,
        totalBuyAmount,
        profit,
        totalPayments,
        remainingAmount,
        getItemCostBasis,
        // API functions
        createDraft,
        saveCustomer,
        saveCostMode,
        saveNotes,
        addItemToServer,
        updateItemOnServer,
        deleteItemFromServer,
        savePayments,
        saveAsDraft,
        saveAsPending,
        completeBuyTransaction,
      }}>
      {children}
    </BuyWizardContext.Provider>
  );
};

// Hook
export const useBuyWizard = (): BuyWizardContextType => {
  const context = useContext(BuyWizardContext);
  if (!context) {
    throw new Error('useBuyWizard must be used within a BuyWizardProvider');
  }
  return context;
};

// Legacy support - existingBuyId maps to buyId
export const useBuyWizardLegacy = () => {
  const context = useBuyWizard();
  return {
    ...context,
    state: {
      ...context.state,
      existingBuyId: context.state.buyId,
    },
  };
};

export default BuyWizardContext;
