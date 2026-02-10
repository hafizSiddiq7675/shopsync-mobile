import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import {Icon} from 'react-native-paper';
import {COLORS, SPACING, RADIUS} from '@constants/theme';

interface WizardFooterProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
  isNextDisabled?: boolean;
  isLoading?: boolean;
  showBack?: boolean;
  nextVariant?: 'primary' | 'success' | 'warning';
}

const WizardFooter: React.FC<WizardFooterProps> = ({
  onBack,
  onNext,
  nextLabel = 'Next',
  backLabel = 'Back',
  isNextDisabled = false,
  isLoading = false,
  showBack = true,
  nextVariant = 'primary',
}) => {
  const getNextButtonStyle = () => {
    switch (nextVariant) {
      case 'success':
        return styles.nextBtnSuccess;
      case 'warning':
        return styles.nextBtnWarning;
      default:
        return styles.nextBtnPrimary;
    }
  };

  return (
    <View style={styles.container}>
      {showBack && onBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Icon source="arrow-left" size={20} color={COLORS.textPrimary} />
          <Text style={styles.backBtnText}>{backLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      <TouchableOpacity
        style={[
          styles.nextBtn,
          getNextButtonStyle(),
          isNextDisabled && styles.nextBtnDisabled,
        ]}
        onPress={onNext}
        disabled={isNextDisabled || isLoading}>
        {isLoading ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Text style={styles.nextBtnText}>{nextLabel}</Text>
            <Icon source="arrow-right" size={20} color={COLORS.white} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  placeholder: {
    width: 130,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardBg,
    gap: SPACING.xs,
    minWidth: 130,
  },
  backBtnText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
    minWidth: 130,
  },
  nextBtnPrimary: {
    backgroundColor: COLORS.purple,
  },
  nextBtnSuccess: {
    backgroundColor: COLORS.green,
  },
  nextBtnWarning: {
    backgroundColor: COLORS.orange,
  },
  nextBtnDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.6,
  },
  nextBtnText: {
    fontSize: 15,
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default WizardFooter;
