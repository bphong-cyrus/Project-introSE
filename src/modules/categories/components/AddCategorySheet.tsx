// SmartSpend AI - Add/Edit Category Bottom Sheet Component
// Features:
// - Category name input
// - Color picker (8 colors)
// - Icon picker (10 icons)
// - Live preview card
// - Save button with validation

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/constants/colors';

interface AddCategorySheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (category: {
    name: string;
    color: string;
    icon: string;
  }) => void;
  validateName?: (name: string) => string | null;
  initialData?: {
    name: string;
    color: string;
    icon: string;
  };
  title?: string;
}

const COLOR_OPTIONS = [
  '#FF6B6B', // Coral
  '#F39C12', // Amber
  '#FFD54F', // Yellow
  '#2ECC71', // Emerald
  '#00BCD4', // Cyan
  '#3498DB', // Blue
  '#3F51B5', // Indigo
  '#9B59B6', // Purple
  '#E91E63', // Pink
  '#E67E22', // Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
];

const ICON_OPTIONS = [
  { icon: 'restaurant', label: 'Ăn uống' },
  { icon: 'cart', label: 'Mua sắm' },
  { icon: 'car', label: 'Di chuyển' },
  { icon: 'book', label: 'Học tập' },
  { icon: 'game-controller', label: 'Giải trí' },
  { icon: 'medical', label: 'Sức khỏe' },
  { icon: 'home', label: 'Nhà cửa' },
  { icon: 'gift', label: 'Quà tặng' },
  { icon: 'cafe', label: 'Cà phê' },
  { icon: 'airplane', label: 'Du lịch' },
  { icon: 'cash', label: 'Tài chính' },
  { icon: 'phone-portrait', label: 'Công nghệ' },
];

const AddCategorySheet: React.FC<AddCategorySheetProps> = ({
  visible,
  onClose,
  onSave,
  validateName,
  initialData,
  title = 'Thêm danh mục mới',
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [selectedColor, setSelectedColor] = useState(initialData?.color || COLOR_OPTIONS[0]);
  const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || ICON_OPTIONS[0].icon);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes or initialData changes
  React.useEffect(() => {
    if (visible) {
      setName(initialData?.name || '');
      setSelectedColor(initialData?.color || COLOR_OPTIONS[0]);
      setSelectedIcon(initialData?.icon || ICON_OPTIONS[0].icon);
      setError('');
    }
  }, [visible, initialData]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên danh mục');
      return;
    }
    if (name.trim().length > 50) {
      setError('Tên danh mục không được quá 50 ký tự');
      return;
    }

    const nameValidationError = validateName?.(name.trim());
    if (nameValidationError) {
      setError(nameValidationError);
      return;
    }

    setError('');
    onSave({
      name: name.trim(),
      color: selectedColor,
      icon: selectedIcon,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Name Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Tên danh mục</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="Nhập tên danh mục"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError('');
                }}
                maxLength={50}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Text style={styles.charCount}>{name.length}/50</Text>
            </View>

            {/* Color Picker */}
            <View style={styles.section}>
              <Text style={styles.label}>Màu sắc</Text>
              <View style={styles.colorGrid}>
                {COLOR_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorItem,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorItemSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Icon Picker */}
            <View style={styles.section}>
              <Text style={styles.label}>Biểu tượng</Text>
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.icon}
                    style={[
                      styles.iconItem,
                      selectedIcon === item.icon && styles.iconItemSelected,
                    ]}
                    onPress={() => setSelectedIcon(item.icon)}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={selectedIcon === item.icon ? Colors.primary : Colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preview */}
            <View style={styles.section}>
              <Text style={styles.label}>Xem trước</Text>
              <View style={styles.previewCard}>
                <View
                  style={[
                    styles.previewIcon,
                    { backgroundColor: selectedColor + '20' },
                  ]}
                >
                  <Ionicons
                    name={selectedIcon as any}
                    size={24}
                    color={selectedColor}
                  />
                </View>
                <Text style={styles.previewName}>
                  {name || 'Tên danh mục'}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Lưu danh mục</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  title: {
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
  closeText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 4,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorItemSelected: {
    borderWidth: 3,
    borderColor: Colors.textPrimary,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconItem: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddCategorySheet;
