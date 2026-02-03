import React from 'react';
import {Icon} from 'react-native-paper';

export type IconName =
  | 'lock'
  | 'currency-usd'
  | 'cart'
  | 'cart-outline'
  | 'home'
  | 'home-outline'
  | 'account'
  | 'magnify'
  | 'plus'
  | 'minus'
  | 'check'
  | 'close'
  | 'arrow-left'
  | 'arrow-right'
  | 'chevron-left'
  | 'chevron-right'
  | 'menu'
  | 'dots-vertical'
  | 'heart'
  | 'heart-outline'
  | 'star'
  | 'star-outline'
  | 'share'
  | 'delete'
  | 'pencil'
  | 'eye'
  | 'eye-off'
  | 'logout'
  | 'apple'
  | 'google'
  | 'facebook'
  | 'cash'
  | 'cog'
  | 'cog-outline';

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
}

const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 24,
  color = '#000000',
}) => {
  return <Icon source={name} size={size} color={color} />;
};

export default AppIcon;
