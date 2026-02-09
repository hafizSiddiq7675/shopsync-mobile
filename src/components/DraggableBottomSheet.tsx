import React, {useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import {COLORS, SPACING, RADIUS} from '@constants/theme';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');
const CLOSE_THRESHOLD = 150; // Distance to drag before closing

interface DraggableBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  minHeight?: string | number;
  maxHeight?: string | number;
  avoidKeyboard?: boolean;
}

const DraggableBottomSheet: React.FC<DraggableBottomSheetProps> = ({
  visible,
  onClose,
  children,
  minHeight = '50%',
  maxHeight = '85%',
  avoidKeyboard = false,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;

  // Reset position when modal opens
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  // Handle pan gesture
  const onGestureEvent = Animated.event<PanGestureHandlerGestureEvent>(
    [{nativeEvent: {translationY: translateY}}],
    {useNativeDriver: true},
  );

  // Handle gesture end
  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    const {translationY: dragY, velocityY} = event.nativeEvent;

    // Close if dragged past threshold or with high velocity
    if (dragY > CLOSE_THRESHOLD || velocityY > 500) {
      // Animate out then close
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onClose();
        translateY.setValue(0);
      });
    } else {
      // Snap back to original position
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 8,
      }).start();
    }
  };

  // Clamp translateY to only allow dragging down (positive values)
  const clampedTranslateY = translateY.interpolate({
    inputRange: [-100, 0, SCREEN_HEIGHT],
    outputRange: [0, 0, SCREEN_HEIGHT],
    extrapolate: 'clamp',
  });

  const content = (
    <View style={styles.overlay}>
      {/* Backdrop - tap to close */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Animated Sheet */}
      <Animated.View
        style={[
          styles.container,
          {
            minHeight,
            maxHeight,
            transform: [{translateY: clampedTranslateY}],
          },
        ]}>
        {/* Drag Handle with Gesture Handler */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}>
          <Animated.View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </Animated.View>
        </PanGestureHandler>

        {/* Content */}
        {children}
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  container: {
    backgroundColor: COLORS.darkBg,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
  },
  dragHandleContainer: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textMuted,
    borderRadius: 2,
  },
});

export default DraggableBottomSheet;
