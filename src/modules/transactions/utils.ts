// UC08 - Search & Filter Utilities
// Vietnamese-aware search and multi-criteria filtering

// Remove Vietnamese diacritics/accents
export const removeAccents = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

// Normalize string for search
export const normalize = (str: string): string => {
  return removeAccents(str.toLowerCase().trim());
};

// Check if query matches string (with Vietnamese accent support)
export const matchesQuery = (query: string, text: string): boolean => {
  if (!query) return true;
  const normalizedQuery = normalize(query);
  const normalizedText = normalize(text);
  return normalizedText.includes(normalizedQuery);
};

// Format VND amount with commas
export const formatVND = (amount: number): string => {
  if (isNaN(amount)) return '0 VND';
  return `${amount.toLocaleString('vi-VN')} VND`;
};

// Format date as YYYY-MM-DD
export const formatDateISO = (date: Date): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format time as HH:mm
export const formatTime = (date: Date): string => {
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Format date as DD/MM/YYYY
export const formatDateDMY = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Format date with time as readable string
export const formatDateTime = (date: Date): string => {
  return `${formatDateDMY(date)} ${formatTime(date)}`;
};

// Format time as 12-hour format (12:15 PM)
export const formatTime12h = (date: Date): string => {
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

// Parse VND input string to number
export const parseVNDInput = (text: string): number => {
  const digits = text.replace(/[^0-9]/g, '');
  return parseInt(digits, 10) || 0;
};

// Format VND input for display (with commas)
export const formatVNDInput = (value: string | number): string => {
  const num = typeof value === 'number' ? value : parseVNDInput(value);
  if (!num) return '';
  return num.toLocaleString('vi-VN');
};