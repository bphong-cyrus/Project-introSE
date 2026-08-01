// SmartSpend AI - Receipt Repository
// Connects AI Scanner receipts to Supabase database
// Follows Repository Pattern from SA-6 architecture

import { supabase, Database } from '../datasources/supabase/supabase';

type ReceiptRow = Database['public']['Tables']['receipts']['Row'];
type ReceiptImageRow = Database['public']['Tables']['receipt_images']['Row'];

export interface ReceiptWithImage extends ReceiptRow {
  image_url?: string;
}

export class ReceiptRepository {
  /**
   * Create a new receipt from AI scan
   */
  async createReceipt(
    userId: string,
    merchantName: string,
    purchaseDate: Date,
    totalAmount: number,
    currencyCode: string = 'VND',
    paymentMethod?: string
  ): Promise<ReceiptRow | null> {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .insert({
          user_id: userId,
          receipt_image_id: null,
          merchant_name: merchantName || null,
          purchase_date: purchaseDate.toISOString().split('T')[0],
          total_amount: totalAmount,
          currency_code: currencyCode,
          payment_method: paymentMethod || null,
          status: 'completed',
        })
        .select()
        .single();

      if (error) {
        console.error('ReceiptRepository.createReceipt error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('ReceiptRepository.createReceipt failed:', error);
      return null;
    }
  }

  /**
   * Upload receipt image and get storage URL
   * Note: This requires Supabase Storage bucket setup
   */
  async uploadReceiptImage(
    receiptId: string,
    imageUri: string,
    fileName: string
  ): Promise<string | null> {
    try {
      const receipt = await this.getReceiptById(receiptId);
      if (!receipt) {
        console.error('ReceiptRepository.uploadReceiptImage missing receipt:', receiptId);
        return null;
      }

      // Upload image to Supabase Storage
      const filePath = `${receiptId}/${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, imageUri, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('ReceiptRepository.uploadReceiptImage upload error:', uploadError);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // Save image reference to database
      const { data: imageRow, error: dbError } = await supabase
        .from('receipt_images')
        .insert({
          user_id: receipt.user_id,
          storage_url: imageUrl,
          content_type: 'image/jpeg',
          file_size_bytes: null,
          metadata: {
            file_name: fileName,
            storage_path: uploadData.path,
          },
        })
        .select()
        .single();

      if (dbError) {
        console.error('ReceiptRepository.uploadReceiptImage db error:', dbError);
        return imageUrl;
      }

      const { error: receiptUpdateError } = await supabase
        .from('receipts')
        .update({
          receipt_image_id: imageRow.receipt_image_id,
          updated_at: new Date().toISOString(),
        })
        .eq('receipt_id', receiptId);

      if (receiptUpdateError) {
        console.error('ReceiptRepository.uploadReceiptImage receipt update error:', receiptUpdateError);
      }

      return imageUrl;
    } catch (error) {
      console.error('ReceiptRepository.uploadReceiptImage failed:', error);
      return null;
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceiptById(receiptId: string): Promise<ReceiptRow | null> {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('receipt_id', receiptId)
        .single();

      if (error) {
        console.error('ReceiptRepository.getReceiptById error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('ReceiptRepository.getReceiptById failed:', error);
      return null;
    }
  }

  /**
   * Get all receipts for a user
   */
  async getReceiptsByUser(userId: string, limit: number = 50): Promise<ReceiptRow[]> {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .order('purchase_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('ReceiptRepository.getReceiptsByUser error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('ReceiptRepository.getReceiptsByUser failed:', error);
      return [];
    }
  }

  /**
   * Delete a receipt and its images
   */
  async deleteReceipt(receiptId: string): Promise<boolean> {
    try {
      const receipt = await this.getReceiptById(receiptId);

      // Delete receipt
      const { error: receiptError } = await supabase
        .from('receipts')
        .delete()
        .eq('receipt_id', receiptId);

      if (receiptError) {
        console.error('ReceiptRepository.deleteReceipt error:', receiptError);
        return false;
      }

      if (receipt?.receipt_image_id) {
        const { error: imageError } = await supabase
          .from('receipt_images')
          .delete()
          .eq('receipt_image_id', receipt.receipt_image_id);

        if (imageError) {
          console.error('ReceiptRepository.deleteReceipt image error:', imageError);
        }
      }

      return true;
    } catch (error) {
      console.error('ReceiptRepository.deleteReceipt failed:', error);
      return false;
    }
  }

  /**
   * Update receipt status
   */
  async updateReceiptStatus(
    receiptId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('receipts')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('receipt_id', receiptId);

      if (error) {
        console.error('ReceiptRepository.updateReceiptStatus error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('ReceiptRepository.updateReceiptStatus failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const receiptRepository = new ReceiptRepository();
