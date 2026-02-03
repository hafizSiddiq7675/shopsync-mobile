import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import AppIcon, {IconName} from './AppIcon';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger';

interface AppButtonProps {
  title: string;
  onPress?: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantColors: Record<ButtonVariant, string> = {
  primary: '#2196F3',
  secondary: '#757575',
  success: '#4CAF50',
  danger: '#F44336',
};

const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}) => {
  const backgroundColor = disabled ? '#BDBDBD' : variantColors[variant];

  return (
    <TouchableOpacity
      style={[styles.button, {backgroundColor}, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}>
      {icon && <AppIcon name={icon} size={20} color="#ffffff" />}
      <Text style={[styles.buttonText, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AppButton;
