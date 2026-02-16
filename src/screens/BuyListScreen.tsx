import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect, CommonActions, NavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {BuyStackParamList, Buy, BuyStatus, TabParamList} from '@types';
import {COLORS, SPACING, RADIUS} from '@constants/theme';
import {getBuys, deleteBuy, restoreBuy} from '@services/buyService';
import {authService} from '@services/authService';
import Header from '@components/Header';
import ConfirmationModal from '@components/ConfirmationModal';

type BuyListNavigationProp = NativeStackNavigationProp<BuyStackParamList, 'BuyList'>;
type TabNavigationProp = NavigationProp<TabParamList>;

const STATUS_FILTERS: {label: string; value: BuyStatus | 'all'}[] = [
  {label: 'All', value: 'all'},
  {label: 'Draft', value: 'draft'},
  {label: 'Pending', value: 'pending'},
  {label: 'Completed', value: 'completed'},
  {label: 'Cancelled', value: 'cancelled'},
  {label: 'Deleted', value: 'deleted'},
];

const BuyListScreen: React.FC = () => {
  const navigation = useNavigation<BuyListNavigationProp>();
  const tabNavigation = useNavigation<TabNavigationProp>();
  const [buys, setBuys] = useState<Buy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BuyStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Confirmation modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'restore'>('delete');
  const [selectedBuy, setSelectedBuy] = useState<Buy | null>(null);

  // Load buys
  const loadBuys = useCallback(async (page = 1, refresh = false) => {
    if (page === 1) {
      refresh ? setIsRefreshing(true) : setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const params = {
      page,
      per_page: 20,
      ...(searchQuery && {search: searchQuery}),
      ...(statusFilter !== 'all' && {status: statusFilter}),
    };

    const response = await getBuys(params);

    if (page === 1) {
      setBuys(response.data);
    } else {
      setBuys(prev => [...prev, ...response.data]);
    }

    setCurrentPage(response.current_page);
    setHasMore(response.current_page < response.last_page);

    setIsLoading(false);
    setIsRefreshing(false);
    setIsLoadingMore(false);
  }, [searchQuery, statusFilter]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadBuys(1);
    }, [loadBuys])
  );

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await authService.logout();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'Login' as any}],
      })
    );
  };

  // Handle refresh
  const handleRefresh = () => {
    loadBuys(1, true);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadBuys(currentPage + 1);
    }
  };

  // Handle search
  const handleSearch = useCallback(() => {
    loadBuys(1);
  }, [loadBuys]);

  // Handle filter change
  const handleFilterChange = (filter: BuyStatus | 'all') => {
    if (filter !== statusFilter) {
      setStatusFilter(filter);
    }
  };

  // Handle delete buy - open confirmation modal
  const handleDeleteBuy = (buy: Buy) => {
    setSelectedBuy(buy);
    setConfirmAction('delete');
    setConfirmModalVisible(true);
  };

  // Handle restore buy - open confirmation modal
  const handleRestoreBuy = (buy: Buy) => {
    setSelectedBuy(buy);
    setConfirmAction('restore');
    setConfirmModalVisible(true);
  };

  // Execute confirmed action
  const handleConfirmAction = async () => {
    if (!selectedBuy) return;

    if (confirmAction === 'delete') {
      const result = await deleteBuy(selectedBuy.id);
      if (result.success) {
        Toast.show({type: 'success', text1: 'Buy deleted successfully'});
        loadBuys(1, true);
      } else {
        Toast.show({type: 'error', text1: result.message || 'Failed to delete buy'});
      }
    } else {
      const result = await restoreBuy(selectedBuy.id);
      if (result.success) {
        Toast.show({type: 'success', text1: 'Buy restored successfully'});
        loadBuys(1, true);
      } else {
        Toast.show({type: 'error', text1: result.message || 'Failed to restore buy'});
      }
    }
  };

  // Reload when filter changes
  React.useEffect(() => {
    loadBuys(1);
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get status badge color
  const getStatusColor = (status: BuyStatus) => {
    switch (status) {
      case 'draft':
        return COLORS.textSecondary;
      case 'pending':
        return COLORS.orange;
      case 'completed':
        return COLORS.green;
      case 'cancelled':
        return COLORS.pink;
      case 'deleted':
        return COLORS.textMuted;
      default:
        return COLORS.textSecondary;
    }
  };

  // Get status icon
  const getStatusIcon = (status: BuyStatus) => {
    switch (status) {
      case 'draft':
        return 'file-document-outline';
      case 'pending':
        return 'clock-outline';
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'close-circle';
      case 'deleted':
        return 'delete';
      default:
        return 'file-document-outline';
    }
  };

  // Render buy card
  const renderBuyCard = ({item}: {item: Buy}) => {
    // Check if viewing deleted items (soft-deleted items keep their original status)
    const isDeleted = statusFilter === 'deleted' || item.status === 'deleted';
    const statusColor = getStatusColor(item.status);
    const hasLoss = item.loss > 0;
    const itemCount = item.items_count ?? item.items?.length ?? 0;

    return (
      <TouchableOpacity
        style={styles.buyCard}
        onPress={() => !isDeleted && navigation.navigate('BuyDetails', {buyId: item.id})}
        activeOpacity={isDeleted ? 1 : 0.7}
        disabled={isDeleted}>
        {/* Status Accent Bar */}
        <View style={[styles.statusAccent, {backgroundColor: statusColor}]} />

        <View style={styles.cardContent}>
          {/* Top Row: Buy Number, Date, Status */}
          <View style={styles.topRow}>
            <Text style={styles.buyNumber}>{item.buy_number}</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
            </Text>
            <View style={[styles.statusBadge, {backgroundColor: statusColor + '15'}]}>
              <Icon source={getStatusIcon(item.status)} size={12} color={statusColor} />
              <Text style={[styles.statusText, {color: statusColor}]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Middle Row: Customer + Financial */}
          <View style={styles.middleRow}>
            {/* Customer */}
            <View style={styles.customerSection}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>
                  {(item.customer?.name || 'N')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {item.customer?.name || 'No Customer'}
                </Text>
                <Text style={styles.itemsCount}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            {/* Financial Stats */}
            <View style={styles.financialSection}>
              <View style={styles.financialItem}>
                <Text style={styles.financialLabel}>Cost</Text>
                <Text style={[styles.financialValue, {color: COLORS.orange}]}>
                  ${item.total_buy_amount.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.financialItem, styles.financialItemRight]}>
                <Text style={styles.financialLabel}>{hasLoss ? 'Loss' : 'Profit'}</Text>
                <Text style={[styles.financialValue, {color: hasLoss ? COLORS.pink : COLORS.green}]}>
                  {hasLoss ? `-$${item.loss.toFixed(2)}` : `$${item.profit.toFixed(2)}`}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Row: Actions */}
          <View style={styles.bottomRow}>
            {isDeleted ? (
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={() => handleRestoreBuy(item)}
                activeOpacity={0.7}>
                <Icon source="restore" size={14} color={COLORS.green} />
                <Text style={styles.restoreButtonText}>Restore</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteBuy(item);
                }}
                activeOpacity={0.7}>
                <Icon source="delete-outline" size={14} color={COLORS.danger} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.viewDetailsButton} activeOpacity={0.7}>
              <Text style={styles.viewDetailsText}>Details</Text>
              <Icon source="chevron-right" size={16} color={COLORS.purple} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Icon source="package-variant-closed" size={64} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>No Buys Found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery || statusFilter !== 'all'
            ? 'Try adjusting your search or filters'
            : 'Create your first buy to get started'}
        </Text>
      </View>
    );
  };

  // Render footer (loading more)
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={COLORS.purple} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Buys"
        showBackButton
        onBackPress={() => tabNavigation.navigate('HomeTab')}
        onLogoutPress={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      {/* Search Bar with New Button */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Icon source="magnify" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search buys..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              loadBuys(1);
            }}>
              <Icon source="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.newBuyButton}
          onPress={() => navigation.navigate('BuyWizard', {})}
          activeOpacity={0.8}>
          <Icon source="plus" size={18} color={COLORS.white} />
          <Text style={styles.newBuyButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Status Filters */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}>
          {STATUS_FILTERS.map(filter => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                statusFilter === filter.value && styles.filterChipActive,
              ]}
              onPress={() => handleFilterChange(filter.value)}>
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter.value && styles.filterChipTextActive,
                ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Buy List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
        </View>
      ) : (
        <FlatList
          data={buys}
          renderItem={renderBuyCard}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.purple}
              colors={[COLORS.purple]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        onConfirm={handleConfirmAction}
        title={confirmAction === 'delete' ? 'Delete Buy' : 'Restore Buy'}
        message={`Are you sure you want to ${confirmAction} ${selectedBuy?.buy_number || 'this buy'}?`}
        confirmText={confirmAction === 'delete' ? 'Delete' : 'Restore'}
        cancelText="Cancel"
        icon={confirmAction === 'delete' ? 'delete-outline' : 'restore'}
        isDestructive={confirmAction === 'delete'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
  },
  filtersWrapper: {
    marginBottom: SPACING.md,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardBg,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.purple,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  buyCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
  },
  statusAccent: {
    width: 3,
  },
  cardContent: {
    flex: 1,
    padding: SPACING.sm + 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  buyNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  dotSeparator: {
    color: COLORS.textMuted,
    marginHorizontal: 6,
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    flex: 1,
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemsCount: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  financialSection: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  financialItem: {
    alignItems: 'flex-end',
  },
  financialItemRight: {
    minWidth: 70,
  },
  financialLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  financialValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xs + 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.purple,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  newBuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    gap: 4,
  },
  newBuyButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.green + '15',
    gap: 4,
  },
  restoreButtonText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.danger + '10',
    gap: 4,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '600',
  },
});

export default BuyListScreen;
