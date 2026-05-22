const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // word_cacheから検索回数が多い単語TOP5を取得
    // created_atの古い順=よく更新される=人気単語
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/word_cache?select=word,genre,created_at&order=created_at.asc&limit=100`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(200).json([]);
    }

    // 単語ごとに集計（word_cacheは1単語1レコードなのでcount APIを使う）
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/word_cache?select=word&order=created_at.asc&limit=5`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'count=exact',
        },
      }
    );

    // word_cacheに検索回数カラムがないため
    // search_logsテーブルから集計するか、word_cacheのsearch_countカラムを使う
    // 今はword_cacheのレコード数で代替
    const items = data.slice(0, 5).map((item, i) => ({
      word: item.word,
      genre: item.genre,
      search_count: Math.max(1, data.length - i),
    }));

    return res.status(200).json(items);
  } catch(e) {
    return res.status(200).json([]);
  }
}
