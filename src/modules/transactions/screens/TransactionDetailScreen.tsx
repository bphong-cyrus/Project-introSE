// SmartSpend AI - Transaction Detail Screen (UC09)
// Frame: Transaction Detail - Hero amount, type badge, key-value details

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { Transaction } from '../../../shared/types';
import { toIoniconName } from '../../../shared/utils/icons';
import { useTransactions } from '../../../state/TransactionContext';
import { formatVND, formatDateDMY, formatTime12h, formatDateISO } from '../utils';

interface TransactionDetailScreenProps {
  transactionId: string;
  onBack: () => void;
  onEdit: (transaction: Transaction) => void;
  onDeleted: () => void;
}

const TransactionDetailScreen: React.FC<TransactionDetailScreenProps> = ({
  transactionId,
  onBack,
  onEdit,
  onDeleted,
}) => {
  const { getTransaction, deleteTransaction } = useTransactions();
  const [isDeleting, setIsDeleting] = useState(false);

  const transaction = useMemo(() => {
    return getTransaction(transactionId);
  }, [transactionId, getTransaction]);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const isExpense = transaction?.type === 'expense';
  const categoryColor = transaction?.category?.color || Colors.primary;
  const categoryIcon = toIoniconName(transaction?.category?.icon, transaction?.category?.name, 'wallet');
  const categoryName = transaction?.category?.name || 'Không phân loại';

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Xóa giao dịch',
      'Bạn có chắc chắn muốn xóa giao dịch này? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteTransaction(transactionId);
              onDeleted();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa giao dịch. Vui lòng thử lại.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [transactionId, deleteTransaction, onDeleted]);

  if (!transaction) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Chi tiết giao dịch</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.errorText}>Không tìm thấy giao dịch</Text>
          <TouchableOpacity style={styles.backToListButton} onPress={onBack}>
            <Text style={styles.backToListText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Chi tiết giao dịch</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEdit(transaction)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Amount Card */}
        <View style={[styles.heroCard, { borderLeftColor: categoryColor }]}>
          <View style={styles.heroTop}>
            {/* Category Icon */}
            <View style={[styles.heroIconContainer, { backgroundColor: categoryColor + '20' }]}>
              <Ionicons name={categoryIcon as any} size={28} color={categoryColor} />
            </View>

            {/* Type Badge */}
            <View style={[
              styles.typeBadge,
              { backgroundColor: isExpense ? '#FDECEA' : '#E8F5E9' }
            ]}>
              <Ionicons
                name={isExpense ? 'arrow-down' : 'arrow-up'}
                size={12}
                color={isExpense ? '#E74C3C' : '#2ECC71'}
              />
              <Text style={[
                styles.typeBadgeText,
                { color: isExpense ? '#E74C3C' : '#2ECC71' }
              ]}>
                {isExpense ? 'Chi tiêu' : 'Thu nhập'}
              </Text>
            </View>
          </View>

          {/* Amount */}
          <Text style={[
            styles.heroAmount,
            { color: isExpense ? '#E74C3C' : '#2ECC71' }
          ]}>
            {isExpense ? '-' : '+'}{formatVND(transaction.amount)}
          </Text>

          {/* Category Name */}
          <Text style={styles.heroCategory}>{categoryName}</Text>
        </View>

        {/* Transaction Name */}
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Tên giao dịch</Text>
          <Text style={styles.detailValue}>{transaction.name}</Text>
        </View>

        {/* Details */}
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Thông tin chi tiết</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconBox}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
              </View>
              <View style={styles.detailItemContent}>
                <Text style={styles.detailItemLabel}>Ngày</Text>
                <Text style={styles.detailItemValue}>{formatDateDMY(transaction.date)}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIconBox}>
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              </View>
              <View style={styles.detailItemContent}>
                <Text style={styles.detailItemLabel}>Giờ</Text>
                <Text style={styles.detailItemValue}>{formatTime12h(transaction.date)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconBox}>
                <Ionicons name="folder-outline" size={16} color={Colors.textSecondary} />
              </View>
              <View style={styles.detailItemContent}>
                <Text style={styles.detailItemLabel}>Danh mục</Text>
                <View style={styles.categoryBadge}>
                  <View style={[styles.catDot, { backgroundColor: categoryColor }]} />
                  <Text style={styles.detailItemValue}>{categoryName}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Note */}
        {transaction.note && transaction.note.trim() !== '' && (
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Ghi chú</Text>
            <Text style={styles.noteText}>{transaction.note}</Text>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.metadataCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Mã giao dịch</Text>
            <Text style={styles.metaValue}>#{transaction.id.slice(0, 8)}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Ngày tạo</Text>
            <Text style={styles.metaValue}>
              {formatDateISO(transaction.createdAt || transaction.date)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.editActionButton}
            onPress={() => onEdit(transaction)}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={18} color={Colors.primary} />
            <Text style={styles.editActionText}>Chỉnh sửa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteActionButton}
            onPress={handleDelete}
            activeOpacity={0.7}
            disabled={isDeleting}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color="#E74C3C"
            />
            <Text style={styles.deleteActionText}>
              {isDeleting ? 'Đang xóa...' : 'Xóa giao dịch'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  editButton: {
    padding: 4,
    minWidth: 40,
    alignItems: 'flex-end',
  },
  placeholder: {
    minWidth: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  heroCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftColor: Colors.primary,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  heroCategory: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  detailItemContent: {
    flex: 1,
  },
  detailItemLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailItemValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  noteText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  metadataCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  metaDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  editActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  editActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  deleteActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FDECEA',
    gap: 8,
  },
  deleteActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  backToListButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backToListText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default TransactionDetailScreen;