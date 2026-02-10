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
import {BuyStackParamList, Buy, BuyStatus, TabParamList} from '@types';
import {COLORS, SPACING, RADIUS} from '@constants/theme';
import {getBuys} from '@services/buyService';
import {authService} from '@services/authService';
import Header from '@components/Header';

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
  const renderBuyCard = ({item}: {item: Buy}) => (
    <TouchableOpacity
      style={styles.buyCard}
      onPress={() => navigation.navigate('BuyDetails', {buyId: item.id})}
      activeOpacity={0.7}>
      {/* Header with Buy Number and Status */}
      <View style={styles.buyCardHeader}>
        <Text style={styles.buyNumber}>{item.buy_number}</Text>
        <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status) + '20'}]}>
          <Icon source={getStatusIcon(item.status)} size={14} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, {color: getStatusColor(item.status)}]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Customer Row */}
      <View style={styles.customerRow}>
        <View style={styles.customerIconWrapper}>
          <Icon source="account" size={18} color={COLORS.purple} />
        </View>
        <Text style={styles.customerName} numberOfLines={1}>
          {item.customer?.name || 'No Customer'}
        </Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Items</Text>
          <Text style={styles.statValue}>{item.items_count ?? item.items?.length ?? 0}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Cost</Text>
          <Text style={[styles.statValue, styles.costValue]}>${item.total_buy_amount.toFixed(2)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{item.loss > 0 ? 'Loss' : 'Profit'}</Text>
          <Text style={[styles.statValue, item.profit > 0 ? styles.profitPositive : item.loss > 0 ? styles.profitNegative : null]}>
            {item.loss > 0 ? `-$${item.loss.toFixed(2)}` : `$${item.profit.toFixed(2)}`}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.buyCardFooter}>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        <Icon source="chevron-right" size={20} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );

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
          onPress={() => navigation.navigate('BuyWizard')}
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
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  customerIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.purple + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  costValue: {
    color: COLORS.orange,
  },
  profitPositive: {
    color: COLORS.green,
  },
  profitNegative: {
    color: COLORS.pink,
  },
  buyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
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
});

export default BuyListScreen;
