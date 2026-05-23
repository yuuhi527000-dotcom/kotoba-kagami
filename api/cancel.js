// api/cancel.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (req.method === 'POST') {
    const { user_id, email, reason } = req.body;
    if (!user_id || !email) return res.status(400).json({ error: 'パラメータ不足' });

    const { data: existing } = await supabase
      .from('cancel_requests')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .single();

    if (existing) return res.status(200).json({ message: 'すでに申請済みです' });

    const { error } = await supabase
      .from('cancel_requests')
      .insert({ user_id, email, reason: reason || '' });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: '解約申請を受け付けました' });
  }

  if (req.method === 'GET') {
    const auth = req.headers.authorization;
    if (!auth || auth !== 'Bearer ' + ADMIN_PASSWORD) {
      return res.status(401).json({ error: '認証エラー' });
    }
    const { data, error } = await supabase
      .from('cancel_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PATCH') {
    const auth = req.headers.authorization;
    if (!auth || auth !== 'Bearer ' + ADMIN_PASSWORD) {
      return res.status(401).json({ error: '認証エラー' });
    }
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'idが必要です' });

    const { error } = await supabase
      .from('cancel_requests')
      .update({ status: 'done' })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: '処理済みにしました' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
