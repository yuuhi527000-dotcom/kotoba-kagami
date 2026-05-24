const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': options.method === 'POST' ? 'return=representation' : '',
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `https://${req.headers.host}`);
  const action = url.searchParams.get('action');

  // ---- 投稿 ----
  if (action === 'submit' && req.method === 'POST') {
    const entry = {
      word:         req.body.word || '',
      kana:         req.body.kana || '',
      nuance:       req.body.nuance || '',
      scene:        req.body.scene || '',
      ba_after:     req.body.ba_after || '',
      genre:        req.body.genre || 'general',
      situation:    req.body.situation || '',
      author_name:  req.body.author_name || '匿名',
      link_kakuyomu: req.body.link_kakuyomu || null,
      link_narou:    req.body.link_narou    || null,
      link_twitter:  req.body.link_twitter  || null,
      status:       'pending',
      created_at:   new Date().toISOString(),
    };
    const r = await sb('/ugc_expressions', { method: 'POST', body: JSON.stringify(entry) });
    if (!r.ok) return res.status(500).json({ error: 'DB error', detail: r.data });
    return res.status(200).json({ success: true });
  }

  // ---- 承認待ち一覧 ----
  if (action === 'pending' && req.method === 'GET') {
    const r = await sb('/ugc_expressions?select=*&status=eq.pending&order=created_at.asc');
    return res.status(200).json(Array.isArray(r.data) ? r.data : []);
  }

  // ---- 承認 ----
  if (action === 'approve' && req.method === 'POST') {
    const { id } = req.body;
    const r = await sb(`/ugc_expressions?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved', approved_at: new Date().toISOString() }),
    });
    return res.status(r.status).json(r.data);
  }

  // ---- 却下 ----
  if (action === 'reject' && req.method === 'POST') {
    const { id } = req.body;
    const r = await sb(`/ugc_expressions?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' }),
    });
    return res.status(r.status).json(r.data);
  }

  // ---- 非表示 ----
  if (action === 'hide' && req.method === 'POST') {
    const { id } = req.body;
    const r = await sb(`/ugc_expressions?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' }),
    });
    return res.status(r.status).json(r.data);
  }

  // ---- 承認済み一覧（管理者用） ----
  if (action === 'approved' && req.method === 'GET') {
    const r = await sb('/ugc_expressions?select=*&status=eq.approved&order=approved_at.desc&limit=100');
    return res.status(200).json(Array.isArray(r.data) ? r.data : []);
  }

  // ---- 関連UGC取得 ----
  if (action === 'related') {
    const word  = url.searchParams.get('word') || '';
    const genre = url.searchParams.get('genre') || 'all';
    let path = `/ugc_expressions?select=*&status=eq.approved&word=eq.${encodeURIComponent(word)}&order=approved_at.desc&limit=20`;
    if (genre && genre !== 'all') path += `&genre=eq.${genre}`;
    const r = await sb(path);
    return res.status(200).json(Array.isArray(r.data) ? r.data : []);
  }

  // ---- 人気UGC取得 ----
  if (action === 'popular') {
    const limit = parseInt(url.searchParams.get('limit') || '5');
    const r = await sb(`/ugc_expressions?select=*&status=eq.approved&order=approved_at.desc&limit=${limit}`);
    return res.status(200).json(Array.isArray(r.data) ? r.data : []);
  }

  // ---- 最新投稿一覧 ----
  if (action === 'latest') {
    const limit  = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100);
    const period = url.searchParams.get('period') || 'all';
    const author = url.searchParams.get('author') || '';
    let path = `/ugc_expressions?select=*&status=eq.approved&order=created_at.desc&limit=${limit}`;
    if (author) path += `&author_name=ilike.*${encodeURIComponent(author)}*`;
    if (period === 'today') {
      const d = new Date(); d.setHours(0,0,0,0);
      path += `&created_at=gte.${d.toISOString()}`;
    } else if (period === 'week') {
      const d = new Date(); d.setDate(d.getDate()-7);
      path += `&created_at=gte.${d.toISOString()}`;
    } else if (period === 'month') {
      const d = new Date(); d.setMonth(d.getMonth()-1);
      path += `&created_at=gte.${d.toISOString()}`;
    }
    const r = await sb(path);
    return res.status(200).json(Array.isArray(r.data) ? r.data : []);
  }

  return res.status(400).json({ error: 'Invalid action' });
}
