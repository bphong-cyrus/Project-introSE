import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.111.0';

const DEV_TEAM_EMAIL = 'nguyentrinhtuanvan@gmail.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ForwardFeedbackPayload = {
  feedbackId?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  technicalNotes?: string;
  relatedModule?: string;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json',
  },
});

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'low':
      return 'Thấp';
    case 'medium':
      return 'Trung bình';
    case 'high':
      return 'Cao';
    case 'critical':
      return 'Khẩn cấp';
    default:
      return priority;
  }
};

const getFeedbackCategoryLabel = (category: string) => {
  switch (category) {
    case 'ai_scanner':
      return 'Lỗi Quét Hóa Đơn (AI Scanner)';
    case 'budget':
      return 'Lỗi Quản Lý Ngân Sách (Budget)';
    case 'transactions':
      return 'Lỗi Lịch Sử Giao Dịch (Transactions)';
    case 'auth':
      return 'Lỗi Đăng Nhập / Tài Khoản (Auth)';
    case 'suggestion':
      return 'Góp Ý Tính Năng Mới (Suggestion)';
    case 'other':
      return 'Khác (Other)';
    default:
      return category;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'SmartSpend AI <onboarding@resend.dev>';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !resendApiKey) {
      return jsonResponse({ error: 'Thiếu cấu hình Edge Function hoặc Resend.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Thiếu token xác thực Admin.' }, 401);
    }

    const payload = await req.json() as ForwardFeedbackPayload;
    const feedbackId = String(payload.feedbackId || '').trim();
    const priority = payload.priority || 'high';
    const technicalNotes = String(payload.technicalNotes || '').trim();
    const relatedModule = String(payload.relatedModule || 'Khác').trim();

    if (!feedbackId) {
      return jsonResponse({ error: 'Thiếu mã phản hồi cần chuyển Dev.' }, 400);
    }

    if (!technicalNotes) {
      return jsonResponse({ error: 'Vui lòng nhập ghi chú kỹ thuật trước khi chuyển Dev.' }, 400);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: 'Token Admin không hợp lệ.' }, 401);
    }

    const adminId = authData.user.id;
    const { data: adminProfile, error: adminError } = await serviceClient
      .from('user_profiles')
      .select('user_id,is_admin,account_status,full_name')
      .eq('user_id', adminId)
      .maybeSingle();

    if (adminError) throw adminError;
    if (!adminProfile?.is_admin || (adminProfile.account_status || 'active') !== 'active') {
      return jsonResponse({ error: 'Tài khoản không có quyền chuyển phản hồi cho Dev Team.' }, 403);
    }

    const { data: feedback, error: feedbackError } = await serviceClient
      .from('feedbacks')
      .select('*')
      .eq('feedback_id', feedbackId)
      .maybeSingle();

    if (feedbackError) throw feedbackError;
    if (!feedback) {
      return jsonResponse({ error: 'Không tìm thấy phản hồi cần chuyển Dev.' }, 404);
    }

    const { data: reporterAuth } = await serviceClient.auth.admin.getUserById(feedback.user_id);
    const reporterEmail = feedback.user_email || reporterAuth?.user?.email || 'Chưa có email';
    const trackingId = `DEV-${Date.now()}-${feedbackId.slice(0, 8).toUpperCase()}`;
    const attachmentLine = feedback.attachment_url
      ? `<p><strong>Ảnh đính kèm:</strong> <a href="${escapeHtml(feedback.attachment_url)}">${escapeHtml(feedback.attachment_url)}</a></p>`
      : '<p><strong>Ảnh đính kèm:</strong> Không có</p>';

    const emailSubject = `[SmartSpend AI][${getPriorityLabel(priority)}] ${feedback.subject}`;
    const emailHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a">
        <h2>Chuyển phản hồi người dùng cho Dev Team</h2>
        <p><strong>Mã tracking:</strong> ${escapeHtml(trackingId)}</p>
        <p><strong>Mã phản hồi:</strong> ${escapeHtml(feedback.feedback_id)}</p>
        <p><strong>User ID:</strong> ${escapeHtml(feedback.user_id)}</p>
        <p><strong>Email người dùng:</strong> ${escapeHtml(reporterEmail)}</p>
        <p><strong>Danh mục:</strong> ${escapeHtml(getFeedbackCategoryLabel(feedback.category))}</p>
        <p><strong>Module liên quan:</strong> ${escapeHtml(relatedModule)}</p>
        <p><strong>Mức độ ưu tiên:</strong> ${escapeHtml(getPriorityLabel(priority))}</p>
        <p><strong>Tiêu đề:</strong> ${escapeHtml(feedback.subject)}</p>
        <h3>Mô tả từ người dùng</h3>
        <p>${escapeHtml(feedback.content).replace(/\n/g, '<br />')}</p>
        ${attachmentLine}
        <h3>Ghi chú kỹ thuật từ Admin</h3>
        <p>${escapeHtml(technicalNotes).replace(/\n/g, '<br />')}</p>
        <p><strong>Admin chuyển tiếp:</strong> ${escapeHtml(adminProfile.full_name || adminId)} (${escapeHtml(adminId)})</p>
      </div>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [DEV_TEAM_EMAIL],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const resendResult = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      return jsonResponse({
        error: 'Không thể gửi email đến Dev Team.',
        detail: resendResult,
      }, 502);
    }

    const forwardedAt = new Date().toISOString();
    const { error: updateError } = await serviceClient
      .from('feedbacks')
      .update({
        status: 'in_progress',
        priority,
        technical_notes: technicalNotes,
        related_module: relatedModule,
        dev_status: 'Chuyển Dev',
        dev_email: DEV_TEAM_EMAIL,
        dev_tracking_id: trackingId,
        forwarded_to_dev_at: forwardedAt,
        forwarded_to_dev_by: adminId,
      })
      .eq('feedback_id', feedbackId);

    if (updateError) throw updateError;

    const { error: auditError } = await serviceClient
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action: 'FORWARD_FEEDBACK_TO_DEV',
        target_type: 'feedback',
        target_id: feedbackId,
        metadata: {
          priority,
          related_module: relatedModule,
          dev_email: DEV_TEAM_EMAIL,
          dev_tracking_id: trackingId,
          resend_id: resendResult?.id || null,
        },
      });

    if (auditError) throw auditError;

    return jsonResponse({
      success: true,
      message: 'Đã chuyển phản hồi cho Dev Team và gửi email thành công.',
      trackingId,
      resendId: resendResult?.id || null,
    });
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Không thể chuyển phản hồi cho Dev Team.',
    }, 500);
  }
});
