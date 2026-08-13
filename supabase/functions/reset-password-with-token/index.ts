// Edge Function: reset-password-with-token
// Mục đích: Đặt lại mật khẩu với verification token từ OTP verification (UC03)
// Ngày: 2026-08-14
// Tác giả: Claude

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.111.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

// Verify JWT token
const verifyToken = (token: string, secret: string): { valid: boolean; payload?: Record<string, unknown>; error?: string } => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Token không hợp lệ.' };
    }

    const [header, payload, signature] = parts;

    // Simple signature verification (base64 encoding for demo)
    const expectedSignature = btoa(`${header}.${payload}${secret}`).slice(0, 43);
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Token signature không hợp lệ.' };
    }

    // Decode payload
    const decodedPayload = JSON.parse(atob(payload));

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < now) {
      return { valid: false, error: 'Token đã hết hạn. Vui lòng xác thực OTP lại.' };
    }

    // Check purpose
    if (decodedPayload.purpose !== 'reset_password') {
      return { valid: false, error: 'Token không hợp lệ cho mục đích đặt lại mật khẩu.' };
    }

    return { valid: true, payload: decodedPayload };
  } catch (error) {
    return { valid: false, error: 'Không thể xác thực token.' };
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Phương thức không được hỗ trợ.' }, 405);
  }

  try {
    // Lấy environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET') || '';

    // Validate environment
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Thiếu cấu hình Supabase.' }, 500);
    }

    // Parse request body
    const { user_id, new_password, verification_token } = await req.json();

    if (!user_id || !new_password || !verification_token) {
      return jsonResponse({ error: 'User ID, mật khẩu mới và token là bắt buộc.' }, 400);
    }

    // Validate password format
    if (new_password.length < 8) {
      return jsonResponse({ error: 'Mật khẩu phải có ít nhất 8 ký tự.' }, 400);
    }

    if (!/[A-Z]/.test(new_password)) {
      return jsonResponse({ error: 'Mật khẩu phải chứa ít nhất 1 chữ hoa.' }, 400);
    }

    if (!/[0-9]/.test(new_password)) {
      return jsonResponse({ error: 'Mật khẩu phải chứa ít nhất 1 chữ số.' }, 400);
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(new_password)) {
      return jsonResponse({ error: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.' }, 400);
    }

    // Verify token
    const tokenResult = verifyToken(verification_token, jwtSecret);
    if (!tokenResult.valid) {
      return jsonResponse({ error: tokenResult.error }, 400);
    }

    const payload = tokenResult.payload!;

    // Verify user_id matches token
    if (payload.user_id !== user_id) {
      return jsonResponse({ error: 'User ID không khớp với token. Vui lòng xác thực lại.' }, 400);
    }

    // Tạo Supabase client với service role (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Update password using Admin API với user_id
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return jsonResponse({ error: 'Không thể cập nhật mật khẩu. Vui lòng thử lại.' }, 500);
    }

    console.log('Password reset successfully for user:', user_id);

    return jsonResponse({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.',
    });
  } catch (error) {
    console.error('Error in reset-password-with-token:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn.',
    }, 500);
  }
});
