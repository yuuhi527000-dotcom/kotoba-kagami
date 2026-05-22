import { createClient } from '@supabase/supabase-js';

// 環境変数からSupabase接続情報を取得
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, max_tokens = 3000, cacheWord, cacheGenre } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: 'claude-3-5-sonnet-20241022', max_tokens, messages }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    // AIの回答が正常ならキャッシュに保存
    if (cacheWord && data.content && data.content[0]?.text) {
      const rawText = data.content[0].text;
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        const parsedData = JSON.parse(cleanJson);
        await supabase.from('word_cache').upsert({
          word: cacheWord,
          genre: cacheGenre || 'all',
          data: parsedData
        });
      } catch (e) {
        console.error('Cache save error:', e);
      }
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
