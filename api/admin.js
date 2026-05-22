const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation',
      ...options.headers,
    },
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch(e) { return { ok: res.ok, status: res.status, data: text }; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 管理者パスワード確認
  const auth = req.headers.authorization || '';
  if (auth !== 'Bearer ' + process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const action = url.searchParams.get('action');

  // ---- ユーザー一覧 ----
  if (action === 'users') {
    const search = url.searchParams.get('search') || '';
    let path = '/users?select=*&order=created_at.desc&limit=50';
    if (search) path += `&email=ilike.*${encodeURIComponent(search)}*`;
    const r = await sb(path);
    return res.status(200).json(Array.isArray(r.data) ? r.data : []);
  }

  // ---- プレミアム付与 ----
  if (action === 'grant' && req.method === 'POST') {
    const { id } = req.body;
    const r = await sb(`/users?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_premium: true,
        premium_since: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    return res.status(200).json(r.data);
  }

  // ---- プレミアム解除 ----
  if (action === 'revoke' && req.method === 'POST') {
    const { id } = req.body;
    const r = await sb(`/users?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_premium: false,
        premium_until: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    return res.status(200).json(r.data);
  }

  return res.status(400).json({ error: 'Invalid action' });
}
