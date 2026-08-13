const { createAnonClient, createUserClient } = require('../services/supabaseClient');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

module.exports = async function requireSupabaseAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Thiếu Authorization Bearer token.',
      });
    }

    const anonClient = createAnonClient();
    const { data, error } = await anonClient.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      });
    }

    req.accessToken = token;
    req.authUser = data.user;
    req.supabase = createUserClient(token);
    return next();
  } catch (err) {
    return next(err);
  }
};
