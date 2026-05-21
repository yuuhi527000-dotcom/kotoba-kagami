// 語録データをSupabaseから取得するAPI

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

  // 特定の語録データ取得
  if (action === 'get' && word) {
    const [synonyms, bas, exprs] = await Promise.all([
      sb(`/synonyms?word=eq.${encodeURIComponent(word)}&order=id.asc`),
      sb(`/beforeafter?word=eq.${encodeURIComponent(word)}&order=id.asc`),
      sb(`/expressions?word=eq.${encodeURIComponent(word)}&order=id.asc`),
    ]);

    // search.jsが期待する形式に変換
    const data = {
      synonyms: synonyms.map(s => ({
        word: s.syn_word,
        kana: s.kana,
        nuance: s.nuance,
        tone: s.tone,
        genres: s.genres || [],
        intensity: s.intensity || 50,
        lyricism: s.lyricism || 50,
        usecases: s.usecases || [],
        desc: s.description,
        scene: s.scene,
      })),
      beforeafter: bas.map(b => ({
        before: b.before_text,
        after: b.after_text,
        note: b.note,
        sit: b.situation,
        genre: b.genre,
      })),
      expressions: exprs.map(e => e.expression),
    };

    return res.status(200).json(data);
  }

  return res.status(400).json({ error: 'Invalid action' });
}
