// SmartSpend AI - Category Picker Component
// UC07: Dropdown selection for transaction category

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';
import { Category } from '../../../shared/types';
import { toIoniconName } from '../../../shared/utils/icons';

interface CategoryPickerProps {
  categories: Category[];
  selectedCategory: Category | null;
  onCategorySelect: (category: Category) => void;
}

const CategoryPicker: React.FC<CategoryPickerProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleSelect = (category: Category) => {
    onCategorySelect(category);
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>DANH MỤC</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        {selectedCategory ? (
          <View style={styles.selectedContent}>
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: selectedCategory.color + '20' },
              ]}
            >
              <Ionicons
                name={toIoniconName(selectedCategory.icon, selectedCategory.name) as any}
                size={20}
                color={selectedCategory.color}
              />
            </View>
            <Text style={styles.categoryName}>{selectedCategory.name}</Text>
          </View>
        ) : (
          <Text style={styles.placeholderText}>Chọn danh mục</Text>
        )}
        <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* Category Selection Modal */}
      <Modal
        visible={showModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn danh mục</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    selectedCategory?.id === item.id && styles.categoryItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: item.color + '20' },
                    ]}
                  >
                    <Ionicons
                      name={toIoniconName(item.icon, item.name) as any}
                      size={22}
                      color={item.color}
                    />
                  </View>
                  <Text style={styles.categoryItemName}>{item.name}</Text>
                  {selectedCategory?.id === item.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    fontSize: 15,
    color: Colors.textMuted,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  categoryItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  categoryItemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
});

export default CategoryPicker;