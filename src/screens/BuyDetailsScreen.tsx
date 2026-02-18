import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  TouchableWithoutFeedback,
  PermissionsAndroid,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {generatePDF} from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import {BuyStackParamList, Buy, BuyItem, ItemCondition} from '@types';
import {COLORS, SPACING, RADIUS} from '@constants/theme';
import {getBuyById, addBuyItemsToInventory, removeBuyItemsFromInventory} from '@services/buyService';
import {getProductBarcode, getProductBarcodes, BarcodeData} from '@services/productService';
import Header from '@components/Header';
import ConfirmationModal from '@components/ConfirmationModal';

type BuyDetailsNavigationProp = NativeStackNavigationProp<BuyStackParamList, 'BuyDetails'>;
type BuyDetailsRouteProp = RouteProp<BuyStackParamList, 'BuyDetails'>;

const CONDITION_LABELS: Record<ItemCondition, string> = {
  new: 'New',
  nm: 'Near Mint',
  lp: 'Lightly Played',
  mp: 'Moderately Played',
  hp: 'Heavily Played',
  dmg: 'Damaged',
};

const BuyDetailsScreen: React.FC = () => {
  const navigation = useNavigation<BuyDetailsNavigationProp>();
  const route = useRoute<BuyDetailsRouteProp>();
  const {buyId} = route.params;

  const [buy, setBuy] = useState<Buy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingItemId, setLoadingItemId] = useState<number | null>(null);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Confirmation modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'add' | 'remove' | 'addAll' | 'removeAll'>('add');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // Barcode modal state
  const [barcodeModalVisible, setBarcodeModalVisible] = useState(false);
  const [currentBarcode, setCurrentBarcode] = useState<BarcodeData | null>(null);
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<Set<number>>(new Set());
  const [isPrintingBulk, setIsPrintingBulk] = useState(false);

  // PDF saved modal state
  const [pdfSavedModalVisible, setPdfSavedModalVisible] = useState(false);
  const [savedPdfPath, setSavedPdfPath] = useState('');

  // State for PDF generation loading
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    loadBuy();
  }, [buyId]);

  const loadBuy = async () => {
    setIsLoading(true);
    const data = await getBuyById(buyId);
    setBuy(data);
    setIsLoading(false);
  };

  // Add single item to inventory
  const handleAddItemToInventory = async (itemId: number) => {
    setLoadingItemId(itemId);
    const result = await addBuyItemsToInventory(buyId, [itemId]);
    setLoadingItemId(null);

    if (result.success) {
      const message = result.merged && result.merged > 0
        ? `Added to inventory (merged with existing)`
        : 'Added to inventory';
      Toast.show({type: 'success', text1: message});
      loadBuy();
    } else {
      Toast.show({type: 'error', text1: result.message || 'Failed to add to inventory'});
    }
  };

  // Remove single item from inventory
  const handleRemoveItemFromInventory = async (itemId: number) => {
    setLoadingItemId(itemId);
    const result = await removeBuyItemsFromInventory(buyId, [itemId]);
    setLoadingItemId(null);

    if (result.success) {
      Toast.show({type: 'success', text1: result.message || 'Removed from inventory'});
      loadBuy();
    } else {
      Toast.show({type: 'error', text1: result.message || 'Failed to remove from inventory'});
    }
  };

  // Add all items to inventory
  const handleAddAllToInventory = async () => {
    if (!buy) return;
    const itemIds = buy.items.filter(item => !item.added_to_inventory).map(item => item.id);
    if (itemIds.length === 0) {
      Toast.show({type: 'info', text1: 'All items already in inventory'});
      return;
    }

    setIsBulkLoading(true);
    const result = await addBuyItemsToInventory(buyId, itemIds);
    setIsBulkLoading(false);

    if (result.success) {
      const message = `${result.added || 0} created, ${result.merged || 0} merged`;
      Toast.show({type: 'success', text1: 'Items added to inventory', text2: message});
      loadBuy();
    } else {
      Toast.show({type: 'error', text1: result.message || 'Failed to add items'});
    }
  };

  // Remove all items from inventory
  const handleRemoveAllFromInventory = async () => {
    if (!buy) return;
    const itemIds = buy.items.filter(item => item.added_to_inventory).map(item => item.id);
    if (itemIds.length === 0) {
      Toast.show({type: 'info', text1: 'No items in inventory to remove'});
      return;
    }

    setIsBulkLoading(true);
    const result = await removeBuyItemsFromInventory(buyId, itemIds);
    setIsBulkLoading(false);

    if (result.success) {
      const message = `${result.reduced || 0} reduced, ${result.deleted || 0} deleted`;
      Toast.show({type: 'success', text1: 'Items removed from inventory', text2: message});
      loadBuy();
    } else {
      Toast.show({type: 'error', text1: result.message || 'Failed to remove items'});
    }
  };

  // Open confirmation modal
  const openConfirmModal = (action: 'add' | 'remove' | 'addAll' | 'removeAll', itemId?: number) => {
    setConfirmAction(action);
    setSelectedItemId(itemId || null);
    setConfirmModalVisible(true);
  };

  // Execute confirmed action
  const handleConfirmAction = async () => {
    switch (confirmAction) {
      case 'add':
        if (selectedItemId) await handleAddItemToInventory(selectedItemId);
        break;
      case 'remove':
        if (selectedItemId) await handleRemoveItemFromInventory(selectedItemId);
        break;
      case 'addAll':
        await handleAddAllToInventory();
        break;
      case 'removeAll':
        await handleRemoveAllFromInventory();
        break;
    }
  };

  // Get confirmation modal text
  const getConfirmModalText = () => {
    switch (confirmAction) {
      case 'add':
        return {title: 'Add to Inventory', message: 'Add this item to inventory?', confirmText: 'Add'};
      case 'remove':
        return {title: 'Remove from Inventory', message: 'Remove this item from inventory? This will reduce quantity from products.', confirmText: 'Remove'};
      case 'addAll':
        return {title: 'Add All to Inventory', message: 'Add all items to inventory?', confirmText: 'Add All'};
      case 'removeAll':
        return {title: 'Remove All from Inventory', message: 'Remove all items from inventory? This will reduce quantities from products.', confirmText: 'Remove All'};
    }
  };

  // ==========================================
  // BARCODE FUNCTIONS
  // ==========================================

  // View single barcode
  const handleViewBarcode = async (sku: string) => {
    setIsBarcodeLoading(true);
    const result = await getProductBarcode(sku);
    setIsBarcodeLoading(false);

    if (result.success && result.data) {
      setCurrentBarcode(result.data);
      setBarcodeModalVisible(true);
    } else {
      Toast.show({type: 'error', text1: result.message || 'Failed to fetch barcode'});
    }
  };

  // Download single barcode as PDF
  const handleDownloadSingleBarcode = async () => {
    if (!currentBarcode) return;

    setIsGeneratingPdf(true);
    try {
      const html = generateBarcodeHtml([currentBarcode]);
      const fileName = `barcode_BUY${buyId}_${currentBarcode.sku}.pdf`;
      const options = {
        html,
        fileName: `barcode_BUY${buyId}_${currentBarcode.sku}`,
        directory: Platform.OS === 'android' ? 'Download' : 'Documents',
      };

      const file = await generatePDF(options);

      if (file.filePath) {
        await sharePdfFile(file.filePath, fileName);
        // Modal is shown on Android, toast only for iOS
        if (Platform.OS === 'ios') {
          Toast.show({type: 'success', text1: 'Barcode PDF saved'});
        }
      }
    } catch (error: any) {
      Toast.show({type: 'error', text1: 'Failed to generate PDF'});
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Toggle item selection for bulk print
  const togglePrintSelection = (itemId: number) => {
    setSelectedForPrint(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Toggle select all items with SKU for printing
  const selectAllForPrint = () => {
    if (!buy) return;
    const itemsWithSku = buy.items
      .filter(item => item.added_to_inventory && item.sku)
      .map(item => item.id);

    // Toggle: if all selected, deselect all; otherwise select all
    if (selectedForPrint.size === itemsWithSku.length && itemsWithSku.length > 0) {
      setSelectedForPrint(new Set());
    } else {
      setSelectedForPrint(new Set(itemsWithSku));
    }
  };

  // Clear print selection
  const clearPrintSelection = () => {
    setSelectedForPrint(new Set());
  };

  // Request storage permission on Android
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      // Android 13+ (API 33) doesn't need WRITE_EXTERNAL_STORAGE for Downloads
      const androidVersion = Platform.Version as number;
      if (androidVersion >= 33) {
        return true;
      }

      // For Android 10-12, check and request permission
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'App needs access to save PDF files to Downloads folder.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  // Share PDF file helper - copies to Downloads folder on Android
  const sharePdfFile = async (filePath: string, fileName: string): Promise<boolean> => {
    try {
      // On Android, copy to public Downloads folder first
      if (Platform.OS === 'android') {
        // Request storage permission first
        const hasPermission = await requestStoragePermission();
        if (!hasPermission) {
          Toast.show({type: 'error', text1: 'Storage permission required'});
          return false;
        }

        const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

        // Copy file to Downloads folder
        await RNFS.copyFile(filePath, downloadPath);

        // Show success modal with the Downloads path
        setSavedPdfPath(downloadPath);
        setPdfSavedModalVisible(true);
        return true;
      }

      // On iOS, use share sheet
      await Share.open({
        url: filePath,
        type: 'application/pdf',
        filename: fileName,
      });
      return true;
    } catch (error: any) {
      // If user cancelled share on iOS, that's fine
      if (error.message?.includes('User did not share') ||
          error.message?.includes('cancel')) {
        return true;
      }

      Toast.show({type: 'error', text1: 'Failed to save PDF'});
      return false;
    }
  };

  // Download selected barcodes as PDF (bulk)
  const handleDownloadSelectedBarcodes = async () => {
    if (!buy || selectedForPrint.size === 0) return;

    const skus = buy.items
      .filter(item => selectedForPrint.has(item.id) && item.sku)
      .map(item => item.sku as string);

    if (skus.length === 0) {
      Toast.show({type: 'info', text1: 'No items with SKU to download'});
      return;
    }

    setIsPrintingBulk(true);
    const result = await getProductBarcodes(skus);

    if (result.success && result.data && result.data.length > 0) {
      try {
        const html = generateBarcodeHtml(result.data);
        const timestamp = Date.now();
        const fileName = `barcodes_BUY${buyId}_${timestamp}.pdf`;
        const options = {
          html,
          fileName: `barcodes_BUY${buyId}_${timestamp}`,
          directory: Platform.OS === 'android' ? 'Download' : 'Documents',
        };

        const file = await generatePDF(options);

        if (file.filePath) {
          await sharePdfFile(file.filePath, fileName);
          // Modal is shown on Android, toast only for iOS
          if (Platform.OS === 'ios') {
            Toast.show({type: 'success', text1: `${result.data.length} barcode(s) saved`});
          }
          clearPrintSelection();
        }
      } catch (error: any) {
        Toast.show({type: 'error', text1: 'Failed to generate PDF'});
      }
    } else {
      Toast.show({type: 'error', text1: result.message || 'Failed to fetch barcodes'});
    }

    setIsPrintingBulk(false);
  };

  // Helper to ensure barcode has proper data URI prefix
  const ensureDataUri = (barcode: string): string => {
    if (!barcode) return '';
    // If already has data URI prefix, return as-is
    if (barcode.startsWith('data:')) {
      return barcode;
    }
    // Otherwise, assume PNG and add prefix
    return `data:image/png;base64,${barcode}`;
  };

  // Generate HTML for printing barcodes
  const generateBarcodeHtml = (products: BarcodeData[]) => {
    return `
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .barcode-page {
              page-break-after: always;
              text-align: center;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .barcode-page:last-child { page-break-after: auto; }
            .shop-name { font-size: 12px; margin-bottom: 8px; color: #666; }
            .barcode-img { max-width: 220px; margin: 10px 0; }
            .product-name { font-size: 11px; margin: 5px 0; color: #333; }
            .sku { font-size: 14px; font-weight: bold; margin-top: 5px; }
          </style>
        </head>
        <body>
          ${products.map(product => `
            <div class="barcode-page">
              <div class="shop-name">ShopSync</div>
              <img class="barcode-img" src="${ensureDataUri(product.barcode)}" />
              <div class="product-name">${product.name}</div>
              <div class="sku">${product.sku}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return COLORS.green;
      case 'pending':
        return COLORS.orange;
      default:
        return COLORS.textSecondary;
    }
  };

  if (isLoading || !buy) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Buy Details" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
        </View>
      </SafeAreaView>
    );
  }

  const notInInventoryCount = buy.items.filter(item => !item.added_to_inventory).length;
  const inInventoryCount = buy.items.filter(item => item.added_to_inventory).length;
  const confirmModalText = getConfirmModalText();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={buy.buy_number}
        showBackButton
        onBackPress={() => navigation.goBack()}
        showNotification={false}
        showLogout={false}
        rightComponent={
          buy.status !== 'completed' ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('BuyWizard', {buyId: buy.id})}>
              <Icon source="pencil" size={20} color={COLORS.white} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status & Date */}
        <View style={styles.statusBar}>
          <View style={[styles.statusBadge, {backgroundColor: getStatusColor(buy.status) + '20'}]}>
            <Icon
              source={buy.status === 'completed' ? 'check-circle' : 'clock-outline'}
              size={16}
              color={getStatusColor(buy.status)}
            />
            <Text style={[styles.statusText, {color: getStatusColor(buy.status)}]}>
              {buy.status.charAt(0).toUpperCase() + buy.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(buy.created_at).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* Created By Section */}
        {buy.created_by && (
          <View style={styles.section}>
            <View style={styles.createdByRow}>
              <Icon source="account-edit-outline" size={18} color={COLORS.purple} />
              <Text style={styles.createdByLabel}>Created By:</Text>
              <Text style={styles.createdByValue}>{buy.created_by}</Text>
            </View>
          </View>
        )}

        {/* Customer Section */}
        {buy.customer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <View style={styles.customerCard}>
              <View style={styles.customerAvatar}>
                <Icon source="account" size={24} color={COLORS.purple} />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{buy.customer.name}</Text>
                <Text style={styles.customerEmail}>{buy.customer.email}</Text>
                {buy.customer.phone && (
                  <Text style={styles.customerPhone}>{buy.customer.phone}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items ({buy.items.length})</Text>
          </View>

          {/* Download Barcodes Section - At Top */}
          {buy.status === 'completed' && (() => {
            const itemsWithSku = buy.items.filter(item => item.added_to_inventory && item.sku);
            if (itemsWithSku.length === 0) return null;
            return (
              <View style={styles.barcodeToolbar}>
                <TouchableOpacity
                  style={styles.selectAllCheckbox}
                  onPress={selectAllForPrint}>
                  <Icon
                    source={selectedForPrint.size === itemsWithSku.length ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={20}
                    color={COLORS.purple}
                  />
                  <Text style={styles.selectAllLabel}>
                    {selectedForPrint.size > 0 ? `${selectedForPrint.size} selected` : 'Select items'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.downloadPdfBtn,
                    selectedForPrint.size === 0 && styles.downloadPdfBtnDisabled
                  ]}
                  onPress={handleDownloadSelectedBarcodes}
                  disabled={isPrintingBulk || selectedForPrint.size === 0}>
                  {isPrintingBulk ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Icon source="barcode" size={18} color={selectedForPrint.size > 0 ? COLORS.white : COLORS.textMuted} />
                      <Text style={[
                        styles.downloadPdfBtnText,
                        selectedForPrint.size === 0 && styles.downloadPdfBtnTextDisabled
                      ]}>
                        Barcodes PDF
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })()}

          {buy.items.map(item => (
            <View key={item.id} style={styles.itemCard}>
              {/* Top Row: Checkbox + Name + SKU */}
              <View style={styles.itemTopRow}>
                {buy.status === 'completed' && item.added_to_inventory && item.sku && (
                  <TouchableOpacity
                    style={styles.itemCheckbox}
                    onPress={() => togglePrintSelection(item.id)}>
                    <Icon
                      source={selectedForPrint.has(item.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={selectedForPrint.has(item.id) ? COLORS.purple : COLORS.textMuted}
                    />
                  </TouchableOpacity>
                )}
                <View style={styles.itemNameSection}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <View style={styles.itemBadges}>
                    <View style={styles.conditionBadge}>
                      <Text style={styles.conditionBadgeText}>{CONDITION_LABELS[item.condition]}</Text>
                    </View>
                    <Text style={styles.qtyText}>× {item.quantity}</Text>
                  </View>
                </View>
                {item.sku && (
                  <View style={styles.skuBadge}>
                    <Text style={styles.skuBadgeText}>{item.sku}</Text>
                  </View>
                )}
              </View>

              {/* Price Row */}
              <View style={styles.itemPriceRow}>
                <View style={styles.priceBox}>
                  <Text style={styles.priceLabel}>Cost</Text>
                  <Text style={styles.priceValueCost}>${item.cost_basis.toFixed(2)}</Text>
                </View>
                <View style={styles.priceArrow}>
                  <Icon source="arrow-right" size={16} color={COLORS.textMuted} />
                </View>
                <View style={styles.priceBox}>
                  <Text style={styles.priceLabel}>Sell</Text>
                  <Text style={styles.priceValueSell}>${item.sell_price.toFixed(2)}</Text>
                </View>
                <View style={[styles.priceBox, styles.profitBox]}>
                  <Text style={styles.priceLabel}>Profit</Text>
                  <Text style={[
                    styles.priceValueProfit,
                    {color: (item.sell_price - item.cost_basis) >= 0 ? COLORS.green : COLORS.danger}
                  ]}>
                    ${(item.sell_price - item.cost_basis).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Action Row */}
              {buy.status === 'completed' && (
                <View style={styles.itemActionRow}>
                  {item.added_to_inventory ? (
                    <>
                      <View style={styles.inventoryStatusBadge}>
                        <Icon source="check-circle" size={14} color={COLORS.green} />
                        <Text style={styles.inventoryStatusText}>In Inventory</Text>
                      </View>
                      <View style={styles.itemActions}>
                        {item.sku && (
                          <TouchableOpacity
                            style={styles.barcodeBtnNew}
                            onPress={() => handleViewBarcode(item.sku as string)}
                            disabled={isBarcodeLoading}>
                            <Icon source="barcode-scan" size={16} color={COLORS.orange} />
                            <Text style={styles.barcodeBtnText}>Barcode</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => openConfirmModal('remove', item.id)}
                          disabled={loadingItemId === item.id}>
                          {loadingItemId === item.id ? (
                            <ActivityIndicator size="small" color={COLORS.danger} />
                          ) : (
                            <Icon source="delete-outline" size={18} color={COLORS.danger} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.notInInventoryStatusBadge}>
                        <Icon source="package-variant" size={14} color={COLORS.textMuted} />
                        <Text style={styles.notInInventoryStatusText}>Not in Inventory</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => handleAddItemToInventory(item.id)}
                        disabled={loadingItemId === item.id}>
                        {loadingItemId === item.id ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <>
                            <Icon source="plus" size={16} color={COLORS.white} />
                            <Text style={styles.addBtnText}>Add to Inventory</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          ))}

          {/* Bulk Actions */}
          {buy.status === 'completed' && (notInInventoryCount > 0 || inInventoryCount > 0) && (
            <View style={styles.bulkActionsContainer}>
              {notInInventoryCount > 0 && (
                <TouchableOpacity
                  style={styles.bulkAddBtn}
                  onPress={() => openConfirmModal('addAll')}
                  disabled={isBulkLoading}>
                  {isBulkLoading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Icon source="playlist-plus" size={20} color={COLORS.white} />
                      <Text style={styles.bulkAddBtnText}>Add All to Inventory ({notInInventoryCount})</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {inInventoryCount > 0 && notInInventoryCount === 0 && (
                <TouchableOpacity
                  style={styles.bulkRemoveBtn}
                  onPress={() => openConfirmModal('removeAll')}
                  disabled={isBulkLoading}>
                  {isBulkLoading ? (
                    <ActivityIndicator size="small" color={COLORS.danger} />
                  ) : (
                    <>
                      <Icon source="playlist-remove" size={20} color={COLORS.danger} />
                      <Text style={styles.bulkRemoveBtnText}>Remove All from Inventory ({inInventoryCount})</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Icon source="chart-box-outline" size={20} color={COLORS.purple} />
            <Text style={styles.sectionTitleNew}>Summary</Text>
          </View>

          {/* Summary Stats Grid */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryStatBox}>
              <View style={[styles.summaryStatIcon, {backgroundColor: COLORS.orange + '20'}]}>
                <Icon source="cash-minus" size={20} color={COLORS.orange} />
              </View>
              <Text style={styles.summaryStatLabel}>Total Paid</Text>
              <Text style={styles.summaryStatValueOrange}>${buy.total_buy_amount.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryStatBox}>
              <View style={[styles.summaryStatIcon, {backgroundColor: COLORS.green + '20'}]}>
                <Icon source="cash-plus" size={20} color={COLORS.green} />
              </View>
              <Text style={styles.summaryStatLabel}>Expected Sell</Text>
              <Text style={styles.summaryStatValueGreen}>${buy.total_sell_value.toFixed(2)}</Text>
            </View>
          </View>

          {/* Profit Banner */}
          <View style={[
            styles.profitBanner,
            {backgroundColor: buy.profit >= 0 ? COLORS.green + '15' : COLORS.danger + '15'}
          ]}>
            <View style={styles.profitBannerLeft}>
              <Icon
                source={buy.profit >= 0 ? 'trending-up' : 'trending-down'}
                size={24}
                color={buy.profit >= 0 ? COLORS.green : COLORS.danger}
              />
              <Text style={styles.profitBannerLabel}>
                {buy.profit >= 0 ? 'Expected Profit' : 'Expected Loss'}
              </Text>
            </View>
            <Text style={[
              styles.profitBannerValue,
              {color: buy.profit >= 0 ? COLORS.green : COLORS.danger}
            ]}>
              ${Math.abs(buy.profit).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Icon source="wallet-outline" size={20} color={COLORS.purple} />
            <Text style={styles.sectionTitleNew}>Payments</Text>
          </View>

          {buy.payments.map((payment, index) => (
            <View
              key={payment.id}
              style={[
                styles.paymentCard,
                index === buy.payments.length - 1 && {marginBottom: 0}
              ]}>
              <View style={styles.paymentIconBox}>
                <Icon
                  source={
                    payment.payment_method_name.toLowerCase().includes('cash') ? 'cash' :
                    payment.payment_method_name.toLowerCase().includes('card') ? 'credit-card' :
                    payment.payment_method_name.toLowerCase().includes('credit') ? 'wallet-giftcard' :
                    'cash-multiple'
                  }
                  size={20}
                  color={COLORS.purple}
                />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentMethodName}>{payment.payment_method_name}</Text>
              </View>
              <Text style={styles.paymentAmountValue}>${payment.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Notes Section */}
        {buy.notes && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Icon source="note-text-outline" size={20} color={COLORS.purple} />
              <Text style={styles.sectionTitleNew}>Notes</Text>
            </View>
            <View style={styles.notesCard}>
              <Text style={styles.notesTextNew}>{buy.notes}</Text>
            </View>
          </View>
        )}

        {/* Photos Section */}
        {buy.photos && buy.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({buy.photos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {buy.photos.map((photo, index) => (
                <View key={index} style={styles.photoPlaceholder}>
                  <Icon source="image" size={32} color={COLORS.textMuted} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{height: 100}} />
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        onConfirm={handleConfirmAction}
        title={confirmModalText.title}
        message={confirmModalText.message}
        confirmText={confirmModalText.confirmText}
        cancelText="Cancel"
        icon={confirmAction.includes('remove') ? 'package-variant-minus' : 'package-variant-plus'}
        isDestructive={confirmAction.includes('remove')}
      />

      {/* Barcode Preview Modal */}
      <Modal
        visible={barcodeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBarcodeModalVisible(false)}>
        <View style={styles.barcodeModalOverlay}>
          <View style={styles.barcodeModalContent}>
            <View style={styles.barcodeModalHeader}>
              <Text style={styles.barcodeModalTitle}>Barcode Preview</Text>
              <TouchableOpacity
                style={styles.barcodeModalClose}
                onPress={() => setBarcodeModalVisible(false)}>
                <Icon source="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {currentBarcode && (
              <View style={styles.barcodePreviewContent}>
                <Image
                  source={{uri: currentBarcode.barcode}}
                  style={styles.barcodeImage}
                  resizeMode="contain"
                />
                <Text style={styles.barcodeProductName}>{currentBarcode.name}</Text>
                <Text style={styles.barcodeSkuText}>{currentBarcode.sku}</Text>
              </View>
            )}

            <View style={styles.barcodeModalActions}>
              <TouchableOpacity
                style={styles.printBarcodeBtn}
                onPress={handleDownloadSingleBarcode}
                disabled={isGeneratingPdf}>
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Icon source="download" size={20} color={COLORS.white} />
                    <Text style={styles.printBarcodeBtnText}>Download PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeBarcodeBtn}
                onPress={() => setBarcodeModalVisible(false)}>
                <Text style={styles.closeBarcodeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PDF Saved Modal */}
      <Modal
        visible={pdfSavedModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPdfSavedModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setPdfSavedModalVisible(false)}>
          <View style={styles.pdfModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pdfModalContainer}>
                {/* Icon */}
                <View style={styles.pdfModalIconContainer}>
                  <Icon source="file-pdf-box" size={32} color={COLORS.green} />
                </View>

                {/* Title */}
                <Text style={styles.pdfModalTitle}>PDF Saved</Text>

                {/* Message */}
                <Text style={styles.pdfModalMessage}>
                  Your barcode PDF has been saved to:
                </Text>
                <Text style={styles.pdfModalPath} numberOfLines={2}>
                  Downloads/{savedPdfPath.split('/').pop()}
                </Text>

                {/* Button */}
                <TouchableOpacity
                  style={styles.pdfModalButton}
                  onPress={() => setPdfSavedModalVisible(false)}
                  activeOpacity={0.7}>
                  <Icon source="check" size={18} color={COLORS.white} />
                  <Text style={styles.pdfModalButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  section: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  selectAllText: {
    color: COLORS.purple,
    fontSize: 13,
    fontWeight: '500',
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  customerEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customerPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // ============ NEW ITEM CARD STYLES ============
  itemCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  itemCheckbox: {
    paddingTop: 2,
  },
  itemNameSection: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  itemBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  conditionBadge: {
    backgroundColor: COLORS.purple + '25',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  conditionBadgeText: {
    fontSize: 11,
    color: COLORS.purple,
    fontWeight: '500',
  },
  qtyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  skuBadge: {
    backgroundColor: COLORS.darkBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  skuBadgeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceBox: {
    flex: 1,
    alignItems: 'center',
  },
  profitBox: {
    backgroundColor: COLORS.darkBg,
    borderRadius: RADIUS.sm,
    paddingVertical: 4,
    marginLeft: SPACING.xs,
  },
  priceLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  priceValueCost: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.orange,
  },
  priceValueSell: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green,
  },
  priceValueProfit: {
    fontSize: 14,
    fontWeight: '700',
  },
  priceArrow: {
    paddingHorizontal: 4,
  },
  itemActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inventoryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inventoryStatusText: {
    fontSize: 12,
    color: COLORS.green,
    fontWeight: '500',
  },
  notInInventoryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notInInventoryStatusText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  barcodeBtnNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orange + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  barcodeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.orange,
  },
  removeBtn: {
    backgroundColor: COLORS.danger + '15',
    padding: 8,
    borderRadius: RADIUS.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  // ============ BULK ACTIONS ============
  bulkActionsContainer: {
    marginTop: SPACING.sm,
  },
  bulkAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  bulkAddBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  bulkRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger + '15',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  bulkRemoveBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  // ============ BARCODE TOOLBAR ============
  barcodeToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.darkBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  selectAllCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  selectAllLabel: {
    fontSize: 13,
    color: COLORS.purple,
    fontWeight: '500',
  },
  downloadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  downloadPdfBtnDisabled: {
    backgroundColor: COLORS.inputBg,
  },
  downloadPdfBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  downloadPdfBtnTextDisabled: {
    color: COLORS.textMuted,
  },
  // ============ OLD STYLES (kept for compatibility) ============
  bulkActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  addAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  addAllButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  removeAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger + '15',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  removeAllButtonText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  // ============ NEW SUMMARY STYLES ============
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionTitleNew: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryStatBox: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  summaryStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  summaryStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryStatValueOrange: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.orange,
  },
  summaryStatValueGreen: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.green,
  },
  profitBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  profitBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  profitBannerLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  profitBannerValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  // ============ NEW PAYMENT STYLES ============
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  paymentIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  paymentAmountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.green,
  },
  // ============ OLD SUMMARY/PAYMENT STYLES (kept for compatibility) ============
  summaryCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  summaryRowProfit: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  summaryValueProfit: {
    fontSize: 16,
    fontWeight: '700',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  paymentMethod: {
    flex: 1,
    fontSize: 14,
    color: COLORS.white,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  notesCard: {
    backgroundColor: COLORS.darkBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.purple,
  },
  notesTextNew: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  createdByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  createdByLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  createdByValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Barcode & Print Styles
  inventoryStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  printCheckbox: {
    padding: 2,
  },
  inventoryActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  barcodeBtn: {
    backgroundColor: COLORS.purple,
    padding: 6,
    borderRadius: RADIUS.sm,
  },
  // Download Barcode Header (at top of items)
  downloadBarcodeHeader: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  downloadBarcodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  selectAllBtnText: {
    color: COLORS.purple,
    fontSize: 13,
    fontWeight: '500',
  },
  downloadSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  downloadSelectedBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  printBarcodeSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  printBarcodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  printBarcodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  printSelectActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  selectAllLink: {
    fontSize: 12,
    color: COLORS.purple,
    fontWeight: '500',
  },
  selectDivider: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  clearLink: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  printSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  printSelectedText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Barcode Modal Styles
  barcodeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeModalContent: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    width: '90%',
    maxWidth: 350,
    overflow: 'hidden',
  },
  barcodeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  barcodeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  barcodeModalClose: {
    padding: 4,
  },
  barcodePreviewContent: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  barcodeImage: {
    width: 250,
    height: 100,
    marginBottom: SPACING.md,
  },
  barcodeProductName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  barcodeSkuText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  barcodeModalActions: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  printBarcodeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  printBarcodeBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  closeBarcodeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  closeBarcodeBtnText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  // PDF Saved Modal Styles
  pdfModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  pdfModalContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pdfModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.green + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  pdfModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  pdfModalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  pdfModalPath: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    backgroundColor: COLORS.inputBg,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  pdfModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xs,
    width: '100%',
  },
  pdfModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default BuyDetailsScreen;
