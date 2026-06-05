const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // word_cacheのsearch_countで降順ソートしてTOP10を取得（dataも含む）
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/word_cache?select=word,genre,search_count,data&order=search_count.desc&limit=10`,
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
    // 例文を1件だけ抽出して返す
    const result = data.map(item => {
      let example = '';
      try {
        const d = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
        if (d && d.beforeafter && d.beforeafter.length > 0) {
          example = d.beforeafter[0].after || '';
        }
      } catch(e) {}
      return {
        word: item.word,
        genre: item.genre,
        search_count: item.search_count,
        example,
      };
    });
    return res.status(200).json(result);
  } catch(e) {
    return res.status(200).json([]);
  }
}
