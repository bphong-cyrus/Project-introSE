// SmartSpend AI - Category Repository
// Connects categories to Supabase database
// Follows Repository Pattern from SA-6 architecture

import { supabase, Database } from '../datasources/supabase/supabase';
import { Category } from '../../shared/types';
import { toIoniconName } from '../../shared/utils/icons';

type CategoryRow = Database['public']['Tables']['categories']['Row'];

export class CategoryRepository {
  /**
   * Map database row to Category type
   */
  private mapRowToCategory(row: CategoryRow): Category {
    return {
      id: row.category_id,
      userId: row.user_id || '',
      name: row.name,
      type: row.type,
      icon: toIoniconName(row.icon, row.name),
      color: row.color || '#607D8B',
      isDefault: row.is_default,
    };
  }

  /**
   * Get all categories (default + user's own)
   * For anonymous users, only returns default categories
   */
  async getAll(userId?: string): Promise<Category[]> {
    try {
      let query = supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');

      const { data, error } = await query;

      if (error) {
        console.error('CategoryRepository.getAll error:', error);
        throw error;
      }

      if (!data) return [];

      return data
        .filter(row => row.is_default || row.user_id === userId)
        .map(row => this.mapRowToCategory(row));
    } catch (error) {
      console.error('CategoryRepository.getAll failed:', error);
      return [];
    }
  }

  /**
   * Get expense categories only
   */
  async getExpenseCategories(userId?: string): Promise<Category[]> {
    try {
      const all = await this.getAll(userId);
      return all.filter(c => c.type === 'expense');
    } catch (error) {
      console.error('CategoryRepository.getExpenseCategories failed:', error);
      return [];
    }
  }

  /**
   * Get income categories only
   */
  async getIncomeCategories(userId?: string): Promise<Category[]> {
    try {
      const all = await this.getAll(userId);
      return all.filter(c => c.type === 'income');
    } catch (error) {
      console.error('CategoryRepository.getIncomeCategories failed:', error);
      return [];
    }
  }

  /**
   * Get category by ID
   */
  async getById(categoryId: string): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('category_id', categoryId)
        .single();

      if (error) {
        console.error('CategoryRepository.getById error:', error);
        return null;
      }

      return data ? this.mapRowToCategory(data) : null;
    } catch (error) {
      console.error('CategoryRepository.getById failed:', error);
      return null;
    }
  }

  /**
   * Create a new category
   */
  async create(
    userId: string,
    name: string,
    type: 'income' | 'expense',
    icon: string,
    color: string
  ): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          name,
          type,
          icon,
          color,
          is_default: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('CategoryRepository.create error:', error);
        return null;
      }

      return data ? this.mapRowToCategory(data) : null;
    } catch (error) {
      console.error('CategoryRepository.create failed:', error);
      return null;
    }
  }

  /**
   * Update a category
   */
  async update(
    categoryId: string,
    updates: Partial<Pick<Category, 'name' | 'icon' | 'color'>>
  ): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({
          name: updates.name,
          icon: updates.icon,
          color: updates.color,
          updated_at: new Date().toISOString(),
        })
        .eq('category_id', categoryId)
        .select()
        .single();

      if (error) {
        console.error('CategoryRepository.update error:', error);
        return null;
      }

      return data ? this.mapRowToCategory(data) : null;
    } catch (error) {
      console.error('CategoryRepository.update failed:', error);
      return null;
    }
  }

  /**
   * Delete (deactivate) a category
   */
  async delete(categoryId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('category_id', categoryId);

      if (error) {
        console.error('CategoryRepository.delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('CategoryRepository.delete failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const categoryRepository = new CategoryRepository();
