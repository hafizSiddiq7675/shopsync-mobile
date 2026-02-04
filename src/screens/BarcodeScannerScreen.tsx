import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import {Icon} from 'react-native-paper';
import {RootStackParamList} from '@types';
import {COLORS, SPACING} from '@constants/theme';
import {getProductBySku, Product} from '@services/productService';
import {useCart} from '../context/CartContext';

type BarcodeScannerNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'BarcodeScanner'
>;

const BarcodeScannerScreen: React.FC = () => {
  const navigation = useNavigation<BarcodeScannerNavigationProp>();
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const {addToCart, canAddMore, cartItems} = useCart();

  // Get current cart quantity for a product
  const getCartQty = (productId: number) => {
    const item = cartItems.find(i => i.id === productId);
    return item ? item.cartQty : 0;
  };

  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [torch, setTorch] = useState(false);

  // Request camera permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Handle barcode scan
  const codeScanner = useCodeScanner({
    codeTypes: [
      'code-128',
      'code-39',
      'code-93',
      'ean-13',
      'ean-8',
      'upc-a',
      'upc-e',
      'qr',
    ],
    onCodeScanned: codes => {
      if (!isScanning || isLoading || codes.length === 0) {
        return;
      }

      const code = codes[0];
      if (code.value) {
        handleBarcodeScan(code.value);
      }
    },
  });

  // Process scanned barcode
  const handleBarcodeScan = useCallback(
    async (sku: string) => {
      setIsScanning(false);
      setIsLoading(true);

      try {
        const product = await getProductBySku(sku);

        if (product) {
          setScannedProduct(product);
        } else {
          Alert.alert(
            'Product Not Found',
            `No product found with SKU: ${sku}`,
            [
              {
                text: 'Scan Again',
                onPress: () => {
                  setIsScanning(true);
                  setScannedProduct(null);
                },
              },
              {
                text: 'Cancel',
                onPress: () => navigation.goBack(),
                style: 'cancel',
              },
            ],
          );
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch product. Please try again.',
        });
        setIsScanning(true);
      } finally {
        setIsLoading(false);
      }
    },
    [navigation],
  );

  // Add product to cart and continue or go back
  const handleAddToCart = useCallback(() => {
    if (scannedProduct) {
      // Check if can add more
      if (!canAddMore(scannedProduct.id, scannedProduct.quantity)) {
        Alert.alert(
          'Stock Limit',
          `Cannot add more. You already have all ${scannedProduct.quantity} available in cart.`,
          [
            {
              text: 'Scan Another',
              onPress: () => {
                setScannedProduct(null);
                setIsScanning(true);
              },
            },
            {
              text: 'Go to Cart',
              onPress: () => navigation.goBack(),
            },
          ],
        );
        return;
      }

      const added = addToCart(scannedProduct);
      if (added) {
        Alert.alert('Added to Cart', `${scannedProduct.name} added to cart`, [
          {
            text: 'Scan More',
            onPress: () => {
              setScannedProduct(null);
              setIsScanning(true);
            },
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    }
  }, [scannedProduct, addToCart, canAddMore, navigation]);

  // Open settings if permission denied
  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  // Permission denied view
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Icon source="camera-off" size={64} color={COLORS.textMuted} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            Please allow camera access to scan barcodes
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.permissionButton, styles.settingsButton]}
            onPress={openSettings}>
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No camera device
  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Icon source="camera-off" size={64} color={COLORS.textMuted} />
          <Text style={styles.permissionTitle}>No Camera Available</Text>
          <Text style={styles.permissionText}>
            This device does not have a camera
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isScanning && !scannedProduct}
        codeScanner={codeScanner}
        torch={torch ? 'on' : 'off'}
      />

      {/* Overlay */}
      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon source="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Scan Barcode</Text>
          <TouchableOpacity
            style={styles.torchButton}
            onPress={() => setTorch(!torch)}>
            <Icon
              source={torch ? 'flashlight' : 'flashlight-off'}
              size={24}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>

        {/* Scanner Frame */}
        <View style={styles.scannerContainer}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.purple}
              style={styles.loading}
            />
          ) : (
            <Text style={styles.instructions}>
              Point camera at product barcode
            </Text>
          )}
        </View>

        {/* Scanned Product Card */}
        {scannedProduct && (
          <View style={styles.productCard}>
            <View style={styles.productIcon}>
              <Icon source="package-variant" size={32} color={COLORS.purple} />
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{scannedProduct.name}</Text>
              <Text style={styles.productSku}>SKU: {scannedProduct.sku}</Text>
              <Text style={styles.productPrice}>
                ${scannedProduct.price.toFixed(2)}
              </Text>
              <View style={styles.stockInfo}>
                <Text
                  style={[
                    styles.stockText,
                    scannedProduct.quantity === 0 && styles.stockTextDanger,
                  ]}>
                  {scannedProduct.quantity === 0
                    ? 'Out of Stock'
                    : `Stock: ${scannedProduct.quantity}`}
                </Text>
                {getCartQty(scannedProduct.id) > 0 && (
                  <Text style={styles.cartQtyText}>
                    {' '}
                    (In cart: {getCartQty(scannedProduct.id)})
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.productActions}>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  (scannedProduct.quantity === 0 ||
                    !canAddMore(scannedProduct.id, scannedProduct.quantity)) &&
                    styles.addButtonDisabled,
                ]}
                onPress={handleAddToCart}
                disabled={scannedProduct.quantity === 0}>
                <Icon source="cart-plus" size={24} color={COLORS.white} />
                <Text style={styles.addButtonText}>
                  {scannedProduct.quantity === 0
                    ? 'Out of Stock'
                    : !canAddMore(scannedProduct.id, scannedProduct.quantity)
                    ? 'Max in Cart'
                    : 'Add to Cart'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scanAgainButton}
                onPress={() => {
                  setScannedProduct(null);
                  setIsScanning(true);
                }}>
                <Text style={styles.scanAgainText}>Scan Another</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  torchButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 280,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.purple,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instructions: {
    marginTop: SPACING.lg,
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'center',
  },
  loading: {
    marginTop: SPACING.lg,
  },
  productCard: {
    backgroundColor: COLORS.cardBg,
    margin: SPACING.md,
    borderRadius: 16,
    padding: SPACING.md,
  },
  productIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  productInfo: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  productSku: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.green,
    marginTop: SPACING.sm,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  stockText: {
    fontSize: 14,
    color: COLORS.green,
    fontWeight: '500',
  },
  stockTextDanger: {
    color: COLORS.danger,
  },
  cartQtyText: {
    fontSize: 14,
    color: COLORS.orange,
  },
  productActions: {
    gap: SPACING.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  scanAgainButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  scanAgainText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.darkBg,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  settingsButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

export default BarcodeScannerScreen;
