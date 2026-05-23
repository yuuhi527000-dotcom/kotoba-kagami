const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 解約申請を登録（ユーザーから）
  if (req.method === 'POST') {
    const { user_id, email, reason } = req.body;
    if (!user_id || !email) return res.status(400).json({ error: 'パラメータ不足' });

    // 重複チェック
    try {
      const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/cancel_requests?user_id=eq.${user_id}&status=eq.pending&select=id&limit=1`,
        { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
      );
      const existing = await checkRes.json();
      if (existing && existing.length > 0) {
        return res.status(200).json({ message: 'すでに申請済みです' });
      }
    } catch(e) {}

    // 登録
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/cancel_requests`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ user_id, email, reason: reason || '' }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.json();
      return res.status(500).json({ error: err.message || '登録失敗' });
    }
    return res.status(200).json({ message: '解約申請を受け付けました' });
  }

  // 解約申請一覧取得（管理者用）
  if (req.method === 'GET') {
    const auth = req.headers.authorization;
    if (!auth || auth !== 'Bearer ' + ADMIN_PASSWORD) {
      return res.status(401).json({ error: '認証エラー' });
    }
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/cancel_requests?select=*&order=created_at.desc`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const data = await r.json();
    return res.status(200).json(data);
  }

  // 対応済みにする（管理者用）
  if (req.method === 'PATCH') {
    const auth = req.headers.authorization;
    if (!auth || auth !== 'Bearer ' + ADMIN_PASSWORD) {
      return res.status(401).json({ error: '認証エラー' });
    }
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'idが必要です' });

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/cancel_requests?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: 'done' }),
      }
    );
    if (!r.ok) return res.status(500).json({ error: '更新失敗' });
    return res.status(200).json({ message: '処理済みにしました' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
