const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // word_cacheのsearch_countで降順ソートしてTOP20を取得
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/word_cache?select=word,genre,search_count&order=search_count.desc&limit=20`,
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
    return res.status(200).json(data);
  } catch(e) {
    return res.status(200).json([]);
  }
}
