export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // Supabase未設定のため空を返す
  return res.status(200).json([]);
}
