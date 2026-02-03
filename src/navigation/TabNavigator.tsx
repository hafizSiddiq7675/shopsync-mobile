import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Icon} from 'react-native-paper';
import {HomeScreen, SaleScreen, BuyScreen} from '@screens';

export type TabParamList = {
  HomeTab: undefined;
  SaleTab: undefined;
  BuyTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_BAR_BG = '#1A1A2E';
const ACTIVE_BG = '#6C63FF';
const INACTIVE_COLOR = '#6B7280';

// Styles defined first to avoid TypeScript reference errors
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: TAB_BAR_BG,
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
    backgroundColor: '#0D0D1A',
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
    backgroundColor: ACTIVE_BG,
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
          <Icon source={iconNameOutline} size={20} color={INACTIVE_COLOR} />
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
        component={SaleScreen}
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
        component={BuyScreen}
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
