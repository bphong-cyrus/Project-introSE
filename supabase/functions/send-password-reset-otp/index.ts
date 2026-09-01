// Edge Function: send-password-reset-otp
// Mục đích: Gửi mã OTP 6 số qua email để đặt lại mật khẩu (UC03)
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

const parseResendError = async (response: Response): Promise<string> => {
  const rawBody = await response.text();
  if (!rawBody) return '';

  try {
    const parsed = JSON.parse(rawBody) as { message?: string; error?: string; name?: string };
    return parsed.message || parsed.error || parsed.name || rawBody;
  } catch {
    return rawBody;
  }
};

const getResendErrorMessage = (status: number, detail: string): string => {
  const normalizedDetail = detail.toLowerCase();

  if (
    status === 403 ||
    normalizedDetail.includes('domain') ||
    normalizedDetail.includes('verify') ||
    normalizedDetail.includes('verified') ||
    normalizedDetail.includes('resend.dev') ||
    normalizedDetail.includes('testing emails')
  ) {
    return 'Cấu hình email gửi OTP chưa hợp lệ. Vui lòng kiểm tra RESEND_FROM_EMAIL/domain đã xác thực trong Supabase Edge Function.';
  }

  if (status === 429 || normalizedDetail.includes('rate limit')) {
    return 'Dịch vụ gửi email đang bị giới hạn tần suất. Vui lòng thử lại sau.';
  }

  return 'Không thể gửi email. Vui lòng thử lại sau.';
};

// Cấu hình
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_PER_15MIN = 3;

// Generate mã OTP 6 số ngẫu nhiên
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// HTML template cho email OTP
const generateEmailHtml = (otpCode: string, email: string): string => {
  return `
<!DOCTYPE html>
<html style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác thực đặt lại mật khẩu</title>
</head>
<body style="background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #4F46E5; font-size: 24px; margin: 0;">SmartSpend AI</h1>
      <p style="color: #666; font-size: 14px; margin-top: 8px;">Quản lý tài chính thông minh</p>
    </div>

    <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px; text-align: center;">
      Xác thực đặt lại mật khẩu
    </h2>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Xin chào,
    </p>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản: <strong>${email}</strong>
    </p>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 16px; text-align: center;">
      Mã xác thực của bạn là:
    </p>

    <div style="background-color: #EEF2FF; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #4F46E5; font-family: monospace;">
        ${otpCode}
      </span>
    </div>

    <p style="color: #dc2626; font-size: 14px; margin-bottom: 24px; text-align: center;">
      ⚠️ Mã này có hiệu lực trong <strong>${OTP_EXPIRY_MINUTES} phút</strong>.
    </p>

    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
        <strong>⚡ Lưu ý bảo mật:</strong><br>
        • Không chia sẻ mã này với bất kỳ ai<br>
        • SmartSpend AI không bao giờ yêu cầu mã OTP qua điện thoại<br>
        • Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Email này được gửi tự động từ SmartSpend AI.<br>
      Vui lòng không trả lời email này.
    </p>
  </div>
</body>
</html>
  `;
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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'SmartSpend AI <onboarding@resend.dev>';

    // Validate environment
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Thiếu cấu hình Supabase.' }, 500);
    }

    if (!resendApiKey) {
      return jsonResponse({ error: 'Thiếu cấu hình Resend API.' }, 500);
    }

    // Parse request body
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return jsonResponse({ error: 'Email không hợp lệ.' }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return jsonResponse({ error: 'Định dạng email không hợp lệ.' }, 400);
    }

    // Tạo Supabase client với service role (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Kiểm tra email có tồn tại trong hệ thống không.
    // listUsers is paginated, so scan pages instead of only checking the first page.
    let userExists = false;
    let page = 1;
    const perPage = 1000;

    while (!userExists) {
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin
        .listUsers({ page, perPage });

      if (authError) {
        console.error('Error listing users:', authError);
        return jsonResponse({ error: 'Không thể kiểm tra email. Vui lòng thử lại.' }, 500);
      }

      const users = authUsers?.users ?? [];
      userExists = users.some((u) => u.email?.toLowerCase() === normalizedEmail);

      if (userExists || users.length < perPage) {
        break;
      }

      page += 1;
    }

    if (!userExists) {
      return jsonResponse({
        error: 'Không tìm thấy tài khoản với email này.',
      }, 404);
    }

    // Kiểm tra rate limit: không cho gửi quá MAX_OTP_PER_15MIN lần trong 15 phút
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentOtps } = await supabaseAdmin
      .from('otps')
      .select('otp_id')
      .eq('email', normalizedEmail)
      .eq('purpose', 'reset_password')
      .gte('created_at', fifteenMinutesAgo);

    if (recentOtps && recentOtps.length >= MAX_OTP_PER_15MIN) {
      return jsonResponse({
        error: `Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau ${15} phút.`,
      }, 429);
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Lưu OTP vào database
    const { error: insertError } = await supabaseAdmin
      .from('otps')
      .insert({
        email: normalizedEmail,
        code: otpCode,
        purpose: 'reset_password',
        expires_at: expiresAt,
        is_used: false,
      });

    if (insertError) {
      console.error('Error inserting OTP:', insertError);
      return jsonResponse({ error: 'Không thể lưu mã OTP. Vui lòng thử lại.' }, 500);
    }

    // Gửi email qua Resend
    const emailHtml = generateEmailHtml(otpCode, normalizedEmail);
    const emailSubject = 'Mã xác thực đặt lại mật khẩu - SmartSpend AI';

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [normalizedEmail],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorDetail = await parseResendError(resendResponse);
      console.error('Resend API error:', {
        status: resendResponse.status,
        detail: errorDetail,
      });

      // Xóa OTP nếu gửi email thất bại
      await supabaseAdmin
        .from('otps')
        .delete()
        .eq('email', normalizedEmail)
        .eq('code', otpCode);

      return jsonResponse({
        error: getResendErrorMessage(resendResponse.status, errorDetail),
        code: 'EMAIL_PROVIDER_ERROR',
      }, 502);
    }

    const resendResult = await resendResponse.json();

    console.log('OTP sent successfully:', {
      email: normalizedEmail,
      resendId: resendResult?.id,
    });

    return jsonResponse({
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn.',
    });
  } catch (error) {
    console.error('Error in send-password-reset-otp:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn.',
    }, 500);
  }
});
