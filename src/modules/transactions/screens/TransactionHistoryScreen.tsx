// SmartSpend AI - Transaction History Screen (Frame 7)
// UC08: Transaction History with advanced search and filtering

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../../shared/constants/colors';
import { Transaction } from '../../../shared/types';
import { useTransactions } from '../../../state/TransactionContext';
import { useCategories } from '../../../state/CategoryContext';
import { formatDateISO, matchesQuery, normalize } from '../utils';
import { QuickFilter } from '../components/FilterChips';
import TransactionCard from '../components/TransactionCard';
import FilterChips from '../components/FilterChips';
import AdvancedFilterModal, { AdvancedFilter } from '../components/AdvancedFilterModal';

interface TransactionHistoryScreenProps {
  onBack?: () => void;
  onTransactionPress?: (transaction: Transaction) => void;
  maxItems?: number; // For Frame 6 sync - limit to top N
  showTopBar?: boolean;
  selectedDate?: Date | null;
}

const DEBOUNCE_MS = 300;

const TransactionHistoryScreen: React.FC<TransactionHistoryScreenProps> = ({
  onBack,
  onTransactionPress,
  maxItems,
  showTopBar = true,
  selectedDate = null,
}) => {
  const navigation = useNavigation();
  const { transactions, isLoading, refreshTransactions } = useTransactions();
  const { allCategories: categories } = useCategories();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter state
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilter>({});
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [hasActiveAdvancedFilter, setHasActiveAdvancedFilter] = useState(false);

  // UI state
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Filter transactions based on all criteria
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // 0. Date selected from Home calendar strip, exact local day only
    if (selectedDate) {
      result = result.filter((t) => {
        const txnDate = new Date(t.date);
        return txnDate.getDate() === selectedDate.getDate() &&
          txnDate.getMonth() === selectedDate.getMonth() &&
          txnDate.getFullYear() === selectedDate.getFullYear();
      });
    }

    // 1. Quick filter (All/Income/Expense/Category)
    switch (quickFilter) {
      case 'income':
        result = result.filter((t) => t.type === 'income');
        break;
      case 'expense':
        result = result.filter((t) => t.type === 'expense');
        break;
      case 'food':
        result = result.filter(
          (t) => t.categoryId === 'exp-cat-1' || t.category?.name?.toLowerCase().includes('ăn')
        );
        break;
      case 'transport':
        result = result.filter(
          (t) =>
            t.categoryId === 'exp-cat-2' ||
            t.category?.name?.toLowerCase().includes('di chuyển')
        );
        break;
      case 'shopping':
        result = result.filter(
          (t) =>
            t.categoryId === 'exp-cat-3' || t.category?.name?.toLowerCase().includes('mua')
        );
        break;
      case 'education':
        result = result.filter(
          (t) =>
            t.categoryId === 'exp-cat-4' || t.category?.name?.toLowerCase().includes('học')
        );
        break;
      case 'other':
        result = result.filter(
          (t) =>
            !['income', 'expense'].includes(quickFilter) &&
            !['exp-cat-1', 'exp-cat-2', 'exp-cat-3', 'exp-cat-4'].includes(t.categoryId || '')
        );
        break;
    }

    // 2. Advanced filter - Type
    if (advancedFilter.type && advancedFilter.type !== 'all') {
      result = result.filter((t) => t.type === advancedFilter.type);
    }

    // 3. Advanced filter - Date range
    if (advancedFilter.dateFrom) {
      result = result.filter((t) => new Date(t.date) >= advancedFilter.dateFrom!);
    }
    if (advancedFilter.dateTo) {
      result = result.filter((t) => new Date(t.date) <= advancedFilter.dateTo!);
    }

    // 4. Advanced filter - Categories
    if (advancedFilter.categoryIds && advancedFilter.categoryIds.length > 0) {
      result = result.filter(
        (t) => t.categoryId && advancedFilter.categoryIds!.includes(t.categoryId)
      );
    }

    // 5. Advanced filter - Amount range
    if (advancedFilter.minAmount !== undefined) {
      result = result.filter((t) => t.amount >= advancedFilter.minAmount!);
    }
    if (advancedFilter.maxAmount !== undefined) {
      result = result.filter((t) => t.amount <= advancedFilter.maxAmount!);
    }

    // 6. Search query (Vietnamese-aware, multi-field)
    if (debouncedQuery) {
      result = result.filter((t) => {
        const searchFields = [
          t.name || '',
          t.category?.name || '',
          t.note || '',
          t.amount.toString(),
        ];
        return searchFields.some((field) => matchesQuery(debouncedQuery, field));
      });
    }

    // Sort by date descending (most recent first)
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply max items limit if specified (for Frame 6 sync)
    if (maxItems && maxItems > 0) {
      result = result.slice(0, maxItems);
    }

    return result;
  }, [transactions, selectedDate, quickFilter, advancedFilter, debouncedQuery, maxItems]);

  // Check if advanced filter is active
  const isAdvancedFilterActive = useMemo(() => {
    const f = advancedFilter;
    return !!(f.dateFrom || f.dateTo || (f.type && f.type !== 'all') ||
      (f.categoryIds && f.categoryIds.length > 0) ||
      f.minAmount !== undefined || f.maxAmount !== undefined);
  }, [advancedFilter]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshTransactions();
    setRefreshing(false);
  }, [refreshTransactions]);

  // Handle transaction press
  const handleTransactionPress = useCallback(
    (transaction: Transaction) => {
      if (onTransactionPress) {
        onTransactionPress(transaction);
      } else {
        // Navigate to detail screen
        (navigation as any).navigate('TransactionDetail', { transactionId: transaction.id });
      }
    },
    [navigation, onTransactionPress]
  );

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    Keyboard.dismiss();
  }, []);

  // Clear all filters
  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    setQuickFilter('all');
    setAdvancedFilter({});
    setHasActiveAdvancedFilter(false);
    Keyboard.dismiss();
  }, []);

  // Render item
  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionCard
        transaction={item}
        onPress={() => handleTransactionPress(item)}
      />
    ),
    [handleTransactionPress]
  );

  // Key extractor
  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  // Empty state
  const EmptyComponent = useMemo(() => {
    const hasFilters = debouncedQuery || quickFilter !== 'all' || isAdvancedFilterActive;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name={hasFilters ? 'search-outline' : 'receipt-outline'}
          size={64}
          color={Colors.textMuted}
        />
        <Text style={styles.emptyTitle}>
          {hasFilters ? 'Không tìm thấy giao dịch' : 'Chưa có giao dịch'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {hasFilters
            ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc'
            : 'Bắt đầu thêm giao dịch đầu tiên của bạn'}
        </Text>
        {hasFilters && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearAllFilters}>
            <Text style={styles.clearButtonText}>Xóa bộ lọc</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [debouncedQuery, quickFilter, isAdvancedFilterActive, handleClearAllFilters]);

  // Active filter indicator
  const hasActiveFilters = quickFilter !== 'all' || isAdvancedFilterActive || !!debouncedQuery;
  const selectedDateLabel = selectedDate ? formatDateISO(selectedDate) : null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Top Bar */}
      {showTopBar && (
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack || (() => (navigation as any).goBack())}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>
            {selectedDateLabel ? `Giao dịch ngày ${selectedDateLabel}` : 'Lịch sử giao dịch'}
          </Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowAdvancedFilter(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={isAdvancedFilterActive ? Colors.primary : Colors.textPrimary}
            />
            {isAdvancedFilterActive && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm giao dịch..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <FilterChips activeFilter={quickFilter} onFilterChange={setQuickFilter} />

      {/* Results Info */}
      {hasActiveFilters && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {filteredTransactions.length} giao dịch
            {maxItems ? ` (hiển thị ${maxItems} gần nhất)` : ''}
          </Text>
          <TouchableOpacity onPress={handleClearAllFilters}>
            <Text style={styles.clearAllText}>Xóa lọc</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          filteredTransactions.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={EmptyComponent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        onScrollBeginDrag={Keyboard.dismiss}
        keyboardShouldPersistTaps="handled"
      />

      {/* Advanced Filter Modal */}
      <AdvancedFilterModal
        visible={showAdvancedFilter}
        onClose={() => setShowAdvancedFilter(false)}
        onApply={(filter) => {
          setAdvancedFilter(filter);
          setHasActiveAdvancedFilter(
            !!(filter.dateFrom || filter.dateTo || (filter.type && filter.type !== 'all') ||
              (filter.categoryIds && filter.categoryIds.length > 0) ||
              filter.minAmount !== undefined || filter.maxAmount !== undefined)
          );
        }}
        categories={categories}
        initialFilter={advancedFilter}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: 4,
    minWidth: 40,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  filterButton: {
    padding: 6,
    minWidth: 40,
    alignItems: 'flex-end',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  clearSearchButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  clearAllText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default TransactionHistoryScreen;