import React, {createContext, useContext, useReducer, ReactNode} from 'react';
import {CostEntryMode, ItemCondition} from '@types';
import {CustomerSearchResult} from '@services/customerService';

// Types
export interface LocalBuyItem {
  localId: string;
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
  // Step 1: Customer
  customer: CustomerSearchResult | null;
  newCustomer: NewCustomerData | null;

  // Step 2: Items
  items: LocalBuyItem[];
  costEntryMode: CostEntryMode;
  allocateTotalAmount: string;

  // Step 3: Payment
  payments: LocalPayment[];

  // Step 5: Complete
  createdBy: string;
  notes: string;

  // Editing state
  existingBuyId: number | null;
  isEditing: boolean;
}

// Action types
type BuyWizardAction =
  | {type: 'SET_CUSTOMER'; payload: CustomerSearchResult | null}
  | {type: 'SET_NEW_CUSTOMER'; payload: NewCustomerData | null}
  | {type: 'ADD_ITEM'; payload: LocalBuyItem}
  | {type: 'UPDATE_ITEM'; payload: LocalBuyItem}
  | {type: 'REMOVE_ITEM'; payload: string}
  | {type: 'SET_ITEMS'; payload: LocalBuyItem[]}
  | {type: 'SET_COST_ENTRY_MODE'; payload: CostEntryMode}
  | {type: 'SET_ALLOCATE_TOTAL'; payload: string}
  | {type: 'ADD_PAYMENT'; payload: LocalPayment}
  | {type: 'REMOVE_PAYMENT'; payload: string}
  | {type: 'SET_PAYMENTS'; payload: LocalPayment[]}
  | {type: 'SET_CREATED_BY'; payload: string}
  | {type: 'SET_NOTES'; payload: string}
  | {type: 'SET_EXISTING_BUY'; payload: {buyId: number; isEditing: boolean}}
  | {type: 'RESET'};

// Initial state
const initialState: BuyWizardState = {
  customer: null,
  newCustomer: null,
  items: [],
  costEntryMode: 'manual',
  allocateTotalAmount: '',
  payments: [],
  createdBy: '',
  notes: '',
  existingBuyId: null,
  isEditing: false,
};

// Reducer
function buyWizardReducer(state: BuyWizardState, action: BuyWizardAction): BuyWizardState {
  switch (action.type) {
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
    case 'SET_COST_ENTRY_MODE':
      return {...state, costEntryMode: action.payload};
    case 'SET_ALLOCATE_TOTAL':
      return {...state, allocateTotalAmount: action.payload};
    case 'ADD_PAYMENT':
      return {...state, payments: [...state.payments, action.payload]};
    case 'REMOVE_PAYMENT':
      return {...state, payments: state.payments.filter(p => p.localId !== action.payload)};
    case 'SET_PAYMENTS':
      return {...state, payments: action.payload};
    case 'SET_CREATED_BY':
      return {...state, createdBy: action.payload};
    case 'SET_NOTES':
      return {...state, notes: action.payload};
    case 'SET_EXISTING_BUY':
      return {...state, existingBuyId: action.payload.buyId, isEditing: action.payload.isEditing};
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

export default BuyWizardContext;
