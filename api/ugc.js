// UGC投稿・承認・取得のサーバー関数

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  // ---- 投稿 ----
  if (action === 'submit' && req.method === 'POST') {
    const entry = { ...req.body, status: 'pending', submitted_at: new Date().toISOString() };
    const r = await supabase('/pending', { method: 'POST', body: JSON.stringify(entry) });
    return res.status(r.status).json(r.data);
  }

  // ---- 承認待ち一覧取得 ----
  if (action === 'pending' && req.method === 'GET') {
    const r = await supabase('/pending?order=submitted_at.asc');
    return res.status(r.status).json(r.data);
  }

  // ---- 承認 ----
  if (action === 'approve' && req.method === 'POST') {
    const { id } = req.body;
    // pendingから取得
    const r1 = await supabase(`/pending?id=eq.${id}`);
    if (!r1.ok || !r1.data[0]) return res.status(404).json({ error: 'not found' });
    const entry = { ...r1.data[0], status: 'approved', approved_at: new Date().toISOString() };
    delete entry.id;
    // approvedに追加
    const r2 = await supabase('/approved', { method: 'POST', body: JSON.stringify(entry) });
    // pendingから削除
    await supabase(`/pending?id=eq.${id}`, { method: 'DELETE' });
    return res.status(r2.status).json(r2.data);
  }

  // ---- 却下 ----
  if (action === 'reject' && req.method === 'POST') {
    const { id } = req.body;
    const r = await supabase(`/pending?id=eq.${id}`, { method: 'DELETE' });
    return res.status(r.status).json({ ok: true });
  }

  // ---- 承認済み一覧取得（管理者用）----
  if (action === 'approved_list' && req.method === 'GET') {
    const r = await supabase('/approved?order=approved_at.desc');
    return res.status(r.status).json(r.data);
  }

  // ---- 関連UGC取得（検索結果表示用）----
  if (action === 'related' && req.method === 'GET') {
    const { word, genre } = req.query;
    let path = `/approved?word=eq.${encodeURIComponent(word)}&order=approved_at.desc&limit=20`;
    if (genre && genre !== 'all') path += `&genre=eq.${genre}`;
    const r = await supabase(path);
    return res.status(r.status).json(r.data);
  }

  return res.status(400).json({ error: 'Invalid action' });
}
