// SmartSpend AI - Category Dropdown Component
// Frame 10: Category selection dropdown synced with Budget module

import React from 'react';
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
import { toIoniconName } from '../../../shared/utils/icons';

interface CategoryDropdownProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelect: (category: Category) => void;
  onClose: () => void;
}

const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  categories,
  selectedCategory,
  onSelect,
  onClose,
}) => {
  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.dropdown}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chọn danh mục</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list}>
            {categories.map((category) => {
              const isSelected = selectedCategory?.id === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.item, isSelected && styles.itemSelected]}
                  onPress={() => onSelect(category)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, { backgroundColor: category.color + '20' }]}>
                    <Ionicons name={toIoniconName(category.icon, category.name) as any} size={20} color={category.color} />
                  </View>
                  <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                    {category.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdown: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  list: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemSelected: {
    backgroundColor: '#E8F5E9',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  itemTextSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
});

export default CategoryDropdown;