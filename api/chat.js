const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function getCached(word, genre) {
  try {
    // まず指定ジャンルで検索
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/word_cache?word=eq.${encodeURIComponent(word)}&genre=eq.${encodeURIComponent(genre)}&select=data&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const rows = await res.json();
    if (rows && rows[0]) return rows[0].data;

    // 指定ジャンルになければ「all」で検索（キャッシュ使い回し）
    if (genre !== 'all') {
      const res2 = await fetch(
        `${SUPABASE_URL}/rest/v1/word_cache?word=eq.${encodeURIComponent(word)}&genre=eq.all&select=data&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const rows2 = await res2.json();
      if (rows2 && rows2[0]) return rows2[0].data;
    }

    return null;
  } catch(e) { return null; }
}

async function saveCache(word, genre, data) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/word_cache`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ word, genre, data, search_count: 1 }),
    });
  } catch(e) {}
}

async function incrementCount(word, genre) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_search_count`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_word: word, p_genre: genre }),
    });
  } catch(e) {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { messages, max_tokens = 1500, word, genre } = req.body;

    // キャッシュチェック（指定ジャンル → allの順で検索）
    if (word && genre) {
      const cached = await getCached(word, genre);
      if (cached) {
        incrementCount(word, genre);
        return res.status(200).json({ cached: true, data: cached });
      }
    }

    // messagesが空ならキャッシュミスを返すだけ（APIを叩かない）
    if (!messages || messages.length === 0) {
      return res.status(200).json({ cached: false });
    }

    // APIを叩く
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens,
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    // キャッシュに保存
    if (word && genre && data.content) {
      const raw = (data.content || []).map(x => x.text || '').join('');
      try {
        const parsed = JSON.parse(raw.replace(/```json/g,'').replace(/```/g,'').trim());
        if (parsed.synonyms) {
          const beforeafter = (req.body.beforeafter) || [];
          const fullData = { ...parsed, beforeafter };
          await saveCache(word, genre, fullData);
        }
      } catch(e) {}
    }

    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
