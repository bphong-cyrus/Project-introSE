// SmartSpend AI - Delete Category Dialog with Transfer Option
// UC06 - Delete Category with cascade logic
// Allows selecting which category to transfer transactions to

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { Category } from '../../../shared/types';

interface DeleteCategoryDialogProps {
  visible: boolean;
  categoryToDelete: Category | null;
  availableCategories: Category[];
  onCancel: () => void;
  onConfirm: (targetCategoryId: string) => void;
}

const DeleteCategoryDialog: React.FC<DeleteCategoryDialogProps> = ({
  visible,
  categoryToDelete,
  availableCategories,
  onCancel,
  onConfirm,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    availableCategories.length > 0 ? availableCategories[0].id : ''
  );

  if (!categoryToDelete) return null;

  const isIncome = categoryToDelete.type === 'income';
  const categoryTypeLabel = isIncome ? 'thu nhập' : 'hạn mức';

  const handleConfirm = () => {
    if (selectedTargetId) {
      onConfirm(selectedTargetId);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={32} color={Colors.warning} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Xóa danh mục {categoryTypeLabel}?</Text>

          {/* Message */}
          <Text style={styles.message}>
            Bạn có chắc chắn muốn xóa danh mục "{categoryToDelete.name}"?
            {'\n\n'}
            Giao dịch sẽ được chuyển sang danh mục khác.
          </Text>

          {/* Category Selection */}
          <Text style={styles.selectionLabel}>Chọn danh mục thay thế:</Text>

          <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
            {availableCategories
              .filter(cat => cat.id !== categoryToDelete.id)
              .map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    selectedTargetId === cat.id && styles.categoryItemSelected,
                  ]}
                  onPress={() => setSelectedTargetId(cat.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: cat.color + '20' },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={18}
                      color={cat.color}
                    />
                  </View>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  {selectedTargetId === cat.id && (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                !selectedTargetId && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedTargetId}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    maxHeight: '80%',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  selectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  categoryList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: Colors.backgroundSecondary,
  },
  categoryItemSelected: {
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.backgroundSecondary,
  },
  confirmButton: {
    backgroundColor: Colors.danger,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DeleteCategoryDialog;
