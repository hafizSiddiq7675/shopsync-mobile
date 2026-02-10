import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {Icon} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import {COLORS, SPACING, RADIUS} from '@constants/theme';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showNotification?: boolean;
  onNotificationPress?: () => void;
  showLogout?: boolean;
  onLogoutPress?: () => void;
  isLoggingOut?: boolean;
  // For HomeScreen style with user info
  leftComponent?: React.ReactNode;
  // Custom right component (replaces default actions)
  rightComponent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  showNotification = true,
  onNotificationPress,
  showLogout = true,
  onLogoutPress,
  isLoggingOut = false,
  leftComponent,
  rightComponent,
}) => {
  return (
    <LinearGradient
      colors={[COLORS.cardBg, COLORS.darkBg]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.header}>
      {/* Left Section */}
      {leftComponent ? (
        leftComponent
      ) : showBackButton ? (
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Icon source="arrow-left" size={24} color={COLORS.purple} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      {/* Title */}
      {title && <Text style={styles.title}>{title}</Text>}

      {/* Right Actions */}
      {rightComponent ? (
        <View style={styles.headerActions}>{rightComponent}</View>
      ) : (
        <View style={styles.headerActions}>
          {showNotification && (
            <TouchableOpacity
              style={[styles.iconButton, styles.iconButtonOrange]}
              onPress={onNotificationPress}>
              <Icon source="bell-outline" size={24} color={COLORS.orange} />
            </TouchableOpacity>
          )}
          {showLogout && (
            <TouchableOpacity
              style={[styles.iconButton, styles.iconButtonPink]}
              onPress={onLogoutPress}
              disabled={isLoggingOut}>
              {isLoggingOut ? (
                <ActivityIndicator size="small" color={COLORS.pink} />
              ) : (
                <Icon source="power" size={24} color={COLORS.pink} />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.purple + '15',
    borderWidth: 1,
    borderColor: COLORS.purple + '30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.purple,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  placeholder: {
    width: 44,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconButtonOrange: {
    backgroundColor: COLORS.orange + '15',
    borderColor: COLORS.orange + '30',
    shadowColor: COLORS.orange,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  iconButtonPink: {
    backgroundColor: COLORS.pink + '15',
    borderColor: COLORS.pink + '30',
    shadowColor: COLORS.pink,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default Header;
