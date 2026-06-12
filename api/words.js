const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { word, action } = req.query;

  // 語録一覧取得
  if (action === 'list') {
    const words = await sb('/words?order=kana.asc&select=word,kana,category');
    return res.status(200).json(words);
  }

  // 人気単語＋例文取得（SEO用）
  if (action === 'popular') {
    try {
      const items = await sb(
        '/word_cache?select=word,genre,search_count,data&order=search_count.desc&genre=eq.all&limit=20'
      );
      const result = (Array.isArray(items) ? items : []).map(item => {
        let examples = [];
        let expressions = [];
        try {
          const d = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
          if (d && d.beforeafter) examples = d.beforeafter.slice(0, 3);
          if (d && d.expressions) expressions = d.expressions.slice(0, 5);
        } catch(e) {}
        return { word: item.word, search_count: item.search_count, examples, expressions };
      });
      return res.status(200).json(result);
    } catch(e) {
      return res.status(200).json([]);
    }
  }

  // 特定の語録データ取得
  if (action === 'get' && word) {
    // まずword_cacheから取得を試みる
    try {
      const cached = await sb(
        `/word_cache?word=eq.${encodeURIComponent(word)}&genre=eq.all&select=data&limit=1`
      );
      if (Array.isArray(cached) && cached[0] && cached[0].data) {
        const d = typeof cached[0].data === 'string' ? JSON.parse(cached[0].data) : cached[0].data;
        return res.status(200).json(d);
      }
    } catch(e) {}

    return res.status(200).json({ synonyms: [], beforeafter: [], expressions: [] });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
