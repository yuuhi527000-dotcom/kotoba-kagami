const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET：一覧取得（誰でも）
  if (req.method === 'GET') {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/announcements?select=*&order=created_at.desc&limit=20`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await r.json();
    return res.status(200).json(Array.isArray(data) ? data : []);
  }

  // POST：投稿（管理者のみ）
  if (req.method === 'POST') {
    const auth = req.headers.authorization || '';
    if (auth !== 'Bearer ' + process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'メッセージを入力してください' });
    }
    const r = await fetch(`${SUPABASE_URL}/rest/v1/announcements`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ message: message.trim() }),
    });
    const data = await r.json();
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
