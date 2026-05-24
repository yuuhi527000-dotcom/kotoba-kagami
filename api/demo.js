const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const DEMO_WORDS = ['感動', '悲しい', '雨', '笑う', '震える', '嬉しい', '好き', '悔しい', '雪', '走る'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { word } = req.query;

  // 単語リストを返す
  if (!word) {
    return res.status(200).json({ words: DEMO_WORDS });
  }

  // 指定単語のキャッシュを返す
  if (!DEMO_WORDS.includes(word)) {
    return res.status(400).json({ error: 'デモ対象外の単語です' });
  }

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/word_cache?word=eq.${encodeURIComponent(word)}&genre=eq.all&select=data&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const rows = await r.json();
    if (!rows || !rows[0]) return res.status(404).json({ error: 'データが見つかりません' });
    return res.status(200).json({ word, data: rows[0].data });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
