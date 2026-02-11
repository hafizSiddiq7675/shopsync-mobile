import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Icon} from 'react-native-paper';
import {
  HomeScreen,
  SaleScreen,
  CheckoutScreen,
  BuyListScreen,
  BuyDetailsScreen,
  Step1CustomerScreen,
  Step2PaymentScreen,
  Step3ItemsScreen,
  Step4ReviewScreen,
  Step5CompleteScreen,
} from '@screens';
import {COLORS} from '@constants/theme';
import {SaleStackParamList, BuyStackParamList, BuyWizardStackParamList} from '@types';
import {BuyWizardProvider} from '@contexts/BuyWizardContext';

export type TabParamList = {
  HomeTab: undefined;
  SaleTab: undefined;
  BuyTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const SaleStack = createNativeStackNavigator<SaleStackParamList>();
const BuyStack = createNativeStackNavigator<BuyStackParamList>();
const BuyWizardStack = createNativeStackNavigator<BuyWizardStackParamList>();

// Nested Sale Stack Navigator (keeps bottom tabs visible)
const SaleStackNavigator: React.FC = () => {
  return (
    <SaleStack.Navigator screenOptions={{headerShown: false}}>
      <SaleStack.Screen name="Sale" component={SaleScreen} />
      <SaleStack.Screen name="Checkout" component={CheckoutScreen} />
    </SaleStack.Navigator>
  );
};

// Buy Wizard Navigator (wrapped with provider)
// Receives buyId from parent route and passes to Step1Customer
const BuyWizardNavigator: React.FC<{route?: {params?: {buyId?: number}}}> = ({route}) => {
  const buyId = route?.params?.buyId;

  return (
    <BuyWizardProvider>
      <BuyWizardStack.Navigator screenOptions={{headerShown: false}}>
        <BuyWizardStack.Screen
          name="Step1Customer"
          component={Step1CustomerScreen}
          initialParams={{buyId}}
        />
        <BuyWizardStack.Screen name="Step2Payment" component={Step2PaymentScreen} />
        <BuyWizardStack.Screen name="Step3Items" component={Step3ItemsScreen} />
        <BuyWizardStack.Screen name="Step4Review" component={Step4ReviewScreen} />
        <BuyWizardStack.Screen name="Step5Complete" component={Step5CompleteScreen} />
      </BuyWizardStack.Navigator>
    </BuyWizardProvider>
  );
};

// Nested Buy Stack Navigator (keeps bottom tabs visible)
const BuyStackNavigator: React.FC = () => {
  return (
    <BuyStack.Navigator screenOptions={{headerShown: false}}>
      <BuyStack.Screen name="BuyList" component={BuyListScreen} />
      <BuyStack.Screen name="BuyDetails" component={BuyDetailsScreen} />
      <BuyStack.Screen
        name="BuyWizard"
        component={BuyWizardNavigator}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
    </BuyStack.Navigator>
  );
};

// Styles defined first to avoid TypeScript reference errors
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.tabBarBg,
    borderTopWidth: 0,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  activeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  inactiveWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
  },
  waveBg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveOuter: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.darkBg,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});

// Reusable Tab Icon Component
const TabIconButton = ({
  focused,
  iconName,
  iconNameOutline,
  label,
}: {
  focused: boolean;
  iconName: string;
  iconNameOutline: string;
  label: string;
}) => (
  <View style={styles.tabItem}>
    {focused ? (
      <View style={styles.activeWrapper}>
        <View style={styles.waveBg}>
          {/* White border */}
          <View style={styles.waveOuter} />
          {/* Purple icon */}
          <View style={styles.iconContainerActive}>
            <Icon source={iconName} size={20} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.tabLabel}>{label}</Text>
      </View>
    ) : (
      <View style={styles.inactiveWrapper}>
        <View style={styles.iconContainer}>
          <Icon source={iconNameOutline} size={20} color={COLORS.tabInactive} />
        </View>
      </View>
    )}
  </View>
);

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}>
      <Tab.Screen
        name="SaleTab"
        component={SaleStackNavigator}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIconButton
              focused={focused}
              iconName="cart"
              iconNameOutline="cart-outline"
              label="Sale"
            />
          ),
        }}
      />
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIconButton
              focused={focused}
              iconName="home"
              iconNameOutline="home-outline"
              label="Home"
            />
          ),
        }}
      />
      <Tab.Screen
        name="BuyTab"
        component={BuyStackNavigator}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIconButton
              focused={focused}
              iconName="currency-usd"
              iconNameOutline="currency-usd"
              label="Buy"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
