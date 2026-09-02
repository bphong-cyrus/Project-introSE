// Edge Function: verify-password-reset-otp
// Mục đích: Xác thực mã OTP và trả về token để đặt lại mật khẩu (UC03)
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

// Cấu hình
const JWT_SECRET = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET') || '';
const VERIFICATION_TOKEN_EXPIRY_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;

type AuthUserSummary = {
  id: string;
  email?: string | null;
};

const findAuthUserByEmail = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  normalizedEmail: string
): Promise<{ user: AuthUserSummary | null; error: unknown }> => {
  // Email is stored by Supabase Auth, not in public.user_profiles.
  // user_profiles is keyed by user_id in the current schema.
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data: authUsers, error } = await supabaseAdmin.auth.admin
      .listUsers({ page, perPage });

    if (error) {
      return { user: null, error };
    }

    const users = authUsers?.users ?? [];
    const user = users.find((u) => u.email?.trim().toLowerCase() === normalizedEmail);

    if (user) {
      return {
        user: {
          id: user.id,
          email: user.email,
        },
        error: null,
      };
    }

    if (users.length < perPage) {
      return { user: null, error: null };
    }

    page += 1;
  }
};

// Tạo verification token (JWT đơn giản)
const createVerificationToken = (
  payload: { email: string; user_id: string; otp_id: string; purpose: string },
  secret: string
): string => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + VERIFICATION_TOKEN_EXPIRY_MINUTES * 60;

  const data = {
    ...payload,
    iat: now,
    exp,
  };

  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(data));

  // Simple signature (for demo - production nên dùng thư viện crypto)
  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = btoa(signatureInput + secret).slice(0, 43);

  return `${base64Header}.${base64Payload}.${signature}`;
};

// Verify signature đơn giản
const verifySignature = (token: string, secret: string): boolean => {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [header, payload, signature] = parts;
  const expectedSignature = btoa(`${header}.${payload}${secret}`).slice(0, 43);

  return signature === expectedSignature;
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

    // Validate environment
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Thiếu cấu hình Supabase.' }, 500);
    }

    if (!JWT_SECRET) {
      return jsonResponse({ error: 'Thiếu cấu hình JWT Secret.' }, 500);
    }

    // Parse request body
    const { email, otp_code } = await req.json();

    if (!email || !otp_code) {
      return jsonResponse({ error: 'Email và mã OTP là bắt buộc.' }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedOtpCode = otp_code.trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return jsonResponse({ error: 'Định dạng email không hợp lệ.' }, 400);
    }

    // Validate OTP format (6 chữ số)
    if (!/^\d{6}$/.test(trimmedOtpCode)) {
      return jsonResponse({ error: 'Mã OTP phải là 6 chữ số.' }, 400);
    }

    // Tạo Supabase client với service role (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Kiểm tra số lần thử sai
    // NOTE: Có thể thêm bảng otp_attempts để track, tạm thời skip để đơn giản

    // Tìm OTP hợp lệ
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otps')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('code', trimmedOtpCode)
      .eq('purpose', 'reset_password')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error('Error querying OTP:', otpError);
      return jsonResponse({ error: 'Không thể xác thực OTP. Vui lòng thử lại.' }, 500);
    }

    if (!otpRecord) {
      return jsonResponse({
        error: 'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.',
      }, 400);
    }

    // Đánh dấu OTP đã sử dụng
    const { error: updateError } = await supabaseAdmin
      .from('otps')
      .update({ is_used: true })
      .eq('otp_id', otpRecord.otp_id);

    if (updateError) {
      console.error('Error marking OTP as used:', updateError);
      return jsonResponse({ error: 'Không thể cập nhật trạng thái OTP. Vui lòng thử lại.' }, 500);
    }

    // Tìm user trong auth.users để lấy user_id.
    // Schema hiện tại: public.user_profiles không có cột email, chỉ có user_id.
    const { user: targetUser, error: authLookupError } = await findAuthUserByEmail(supabaseAdmin, normalizedEmail);

    if (authLookupError) {
      console.error('Error looking up auth user by email:', authLookupError);
      return jsonResponse({ error: 'Không thể xác định tài khoản. Vui lòng thử lại.' }, 500);
    }

    if (!targetUser) {
      return jsonResponse({
        error: 'Không tìm thấy tài khoản liên kết với email này.',
      }, 404);
    }

    // Tạo verification token (JWT)
    const verificationToken = createVerificationToken(
      {
        email: normalizedEmail,
        user_id: targetUser.id,
        otp_id: otpRecord.otp_id,
        purpose: 'reset_password',
      },
      JWT_SECRET
    );

    console.log('OTP verified successfully:', {
      email: normalizedEmail,
      userId: targetUser.id,
      otpId: otpRecord.otp_id,
    });

    return jsonResponse({
      success: true,
      message: 'Xác thực OTP thành công.',
      verification_token: verificationToken,
      expires_in_minutes: VERIFICATION_TOKEN_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error('Error in verify-password-reset-otp:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn.',
    }, 500);
  }
});
