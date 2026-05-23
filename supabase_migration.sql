-- 解約申請テーブル
CREATE TABLE IF NOT EXISTS cancel_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  email TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',  -- pending / done
  created_at TIMESTAMPTZ DEFAULT NOW()
);
