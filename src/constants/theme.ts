import {Platform} from 'react-native';

export const COLORS = {
  // Brand colors
  purple: '#6C63FF',
  purpleLight: '#8B7FFF',
  pink: '#FF6B9D',
  pinkLight: '#FF8FB3',
  green: '#4CAF50',
  greenLight: '#66BB6A',
  orange: '#FF9800',
  orangeLight: '#FFB74D',

  // Dark theme backgrounds
  darkBg: '#0D0D1A',
  cardBg: '#1A1A2E',
  cardBgLight: '#222240',
  cardBgPurple: 'rgba(108, 99, 255, 0.08)',
  inputBg: '#252542',
  border: '#2A2A4A',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  warningBg: '#cd8a05',
  primaryBg: '#0d4b9b',

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#8B8BA7',
  textMuted: '#5A5A7A',

  // Tab bar
  tabBarBg: '#1A1A2E',
  tabInactive: '#6B7280',

  // Status colors
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FF9800',

  // Base colors
  white: '#FFFFFF',
  black: '#000000',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
};

export const FONTS = {
  regular: 'System',
  bold: 'System',
};

export const SIZES = {
  base: 8,
  small: 12,
  medium: 16,
  large: 20,
  xlarge: 24,
  xxlarge: 32,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// Border radius constants
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// Shadow presets for cards and elevated elements
export const SHADOWS = {
  none: {},
  small: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  // Colored glow shadows
  purpleGlow: {
    shadowColor: '#6C63FF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  greenGlow: {
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  orangeGlow: {
    shadowColor: '#FF9800',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  pinkGlow: {
    shadowColor: '#FF6B9D',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

// Common card styles
export const CARD_STYLES = {
  base: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  elevated: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.medium,
  },
  glass: {
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
};

// Modal common styles
export const MODAL_STYLES = {
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end' as const,
  },
  container: {
    backgroundColor: COLORS.darkBg,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textMuted,
    borderRadius: 2,
    alignSelf: 'center' as const,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
};
