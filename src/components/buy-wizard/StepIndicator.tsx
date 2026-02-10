import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Icon} from 'react-native-paper';
import {COLORS, SPACING} from '@constants/theme';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  labels = ['Customer', 'Items', 'Payment', 'Review', 'Complete'],
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {Array.from({length: totalSteps}, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isLast = index === totalSteps - 1;

          return (
            <React.Fragment key={index}>
              {/* Step Circle */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isActive && styles.circleActive,
                  ]}>
                  {isCompleted ? (
                    <Icon source="check" size={14} color={COLORS.white} />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isActive && styles.stepNumberActive,
                      ]}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                {labels[index] && (
                  <Text
                    style={[
                      styles.stepLabel,
                      isActive && styles.stepLabelActive,
                      isCompleted && styles.stepLabelCompleted,
                    ]}
                    numberOfLines={1}>
                    {labels[index]}
                  </Text>
                )}
              </View>

              {/* Connector Line */}
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    stepNumber < currentStep && styles.lineCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.cardBg,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.inputBg,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  circleActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  stepNumberActive: {
    color: COLORS.white,
  },
  stepLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: COLORS.purple,
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: COLORS.green,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginTop: 13, // Half of circle height
    marginHorizontal: -4,
  },
  lineCompleted: {
    backgroundColor: COLORS.green,
  },
});

export default StepIndicator;
