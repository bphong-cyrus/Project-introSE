// SmartSpend AI - Transaction Repository
// Connects transactions to Supabase database
// Follows Repository Pattern from SA-6 architecture
// NOTE: Database table was renamed from expenses to transactions.

import { supabase, Database } from '../datasources/supabase/supabase';
import { Transaction } from '../../shared/types';

type TransactionRow = Database['public']['Tables']['transactions']['Row'];

export class TransactionRepository {
  /**
   * Map database row to Transaction type
   */
  private mapRowToTransaction(row: TransactionRow, categoryName?: string, categoryIcon?: string, categoryColor?: string): Transaction {
    return {
      id: row.transaction_id,
      userId: row.user_id,
      name: row.name || row.description || 'Giao dịch',
      amount: row.amount,
      type: row.type,
      categoryId: row.category_id,
      note: row.note || undefined,
      date: new Date(row.transaction_date),
      imageUrl: row.receipt_id || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Get all transactions for a user
   */
  async getAll(userId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('TransactionRepository.getAll error:', error);
        return [];
      }

      if (!data) return [];

      return data.map(row => this.mapRowToTransaction(row));
    } catch (error) {
      console.error('TransactionRepository.getAll failed:', error);
      return [];
    }
  }

  /**
   * Get transactions by month and year
   */
  async getByMonth(userId: string, month: number, year: number): Promise<Transaction[]> {
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = month === 11
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 2).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('TransactionRepository.getByMonth error:', error);
        return [];
      }

      if (!data) return [];

      return data.map(row => this.mapRowToTransaction(row));
    } catch (error) {
      console.error('TransactionRepository.getByMonth failed:', error);
      return [];
    }
  }

  /**
   * Get transactions by category
   */
  async getByCategory(userId: string, categoryId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('TransactionRepository.getByCategory error:', error);
        return [];
      }

      if (!data) return [];

      return data.map(row => this.mapRowToTransaction(row));
    } catch (error) {
      console.error('TransactionRepository.getByCategory failed:', error);
      return [];
    }
  }

  /**
   * Get transaction by ID
   */
  async getById(transactionId: string): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (error) {
        console.error('TransactionRepository.getById error:', error);
        return null;
      }

      return data ? this.mapRowToTransaction(data) : null;
    } catch (error) {
      console.error('TransactionRepository.getById failed:', error);
      return null;
    }
  }

  /**
   * Create a new transaction
   */
  async create(transaction: Omit<Transaction, 'id' | 'imageUrl' | 'createdAt' | 'updatedAt'>): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: transaction.userId,
          category_id: transaction.categoryId,
          receipt_id: null,
          receipt_line_item_id: null,
          name: transaction.name,
          description: transaction.name,
          amount: transaction.amount,
          type: transaction.type,
          note: transaction.note || null,
          currency_code: 'VND',
          transaction_date: transaction.date instanceof Date
            ? transaction.date.toISOString().split('T')[0]
            : transaction.date,
          payment_method: null,
          source: 'manual',
        })
        .select()
        .single();

      if (error) {
        console.error('TransactionRepository.create error:', error);
        return null;
      }

      return data ? this.mapRowToTransaction(data) : null;
    } catch (error) {
      console.error('TransactionRepository.create failed:', error);
      return null;
    }
  }

  /**
   * Update a transaction
   */
  async update(transactionId: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) {
        updateData.name = updates.name;
        updateData.description = updates.name;
      }
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
      if (updates.note !== undefined) updateData.note = updates.note;
      if (updates.date !== undefined) {
        updateData.transaction_date = updates.date instanceof Date
          ? updates.date.toISOString().split('T')[0]
          : updates.date;
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('transaction_id', transactionId)
        .select()
        .single();

      if (error) {
        console.error('TransactionRepository.update error:', error);
        return null;
      }

      return data ? this.mapRowToTransaction(data) : null;
    } catch (error) {
      console.error('TransactionRepository.update failed:', error);
      return null;
    }
  }

  /**
   * Delete a transaction
   */
  async delete(transactionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('transaction_id', transactionId);

      if (error) {
        console.error('TransactionRepository.delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('TransactionRepository.delete failed:', error);
      return false;
    }
  }

  /**
   * Calculate total spent for a user in a month
   * This replaces storing total_spent as a column - uses function/query
   */
  async getTotalSpentByMonth(userId: string, month: number, year: number): Promise<number> {
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = month === 11
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 2).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate);

      if (error) {
        console.error('TransactionRepository.getTotalSpentByMonth error:', error);
        return 0;
      }

      if (!data) return 0;

      return data.reduce((sum, row) => sum + row.amount, 0);
    } catch (error) {
      console.error('TransactionRepository.getTotalSpentByMonth failed:', error);
      return 0;
    }
  }

  /**
   * Calculate total income for a user in a month
   */
  async getTotalIncomeByMonth(userId: string, month: number, year: number): Promise<number> {
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = month === 11
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 2).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'income')
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate);

      if (error) {
        console.error('TransactionRepository.getTotalIncomeByMonth error:', error);
        return 0;
      }

      if (!data) return 0;

      return data.reduce((sum, row) => sum + row.amount, 0);
    } catch (error) {
      console.error('TransactionRepository.getTotalIncomeByMonth failed:', error);
      return 0;
    }
  }

  /**
   * Get category breakdown for pie chart
   */
  async getCategoryBreakdown(userId: string, month: number, year: number): Promise<{ categoryId: string; total: number }[]> {
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = month === 11
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 2).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate);

      if (error) {
        console.error('TransactionRepository.getCategoryBreakdown error:', error);
        return [];
      }

      if (!data) return [];

      // Group by category
      const breakdown: Record<string, number> = {};
      for (const row of data) {
        breakdown[row.category_id] = (breakdown[row.category_id] || 0) + row.amount;
      }

      return Object.entries(breakdown).map(([categoryId, total]) => ({
        categoryId,
        total,
      }));
    } catch (error) {
      console.error('TransactionRepository.getCategoryBreakdown failed:', error);
      return [];
    }
  }
}

// Singleton instance
export const transactionRepository = new TransactionRepository();
