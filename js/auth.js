// ===== 認証ユーティリティ =====

const SUPABASE_URL = 'https://qkwfdguuvvsedhvwlgwz.supabase.co';

// Supabase Anon Key（Vercel環境変数から取得できないためフロントに直接記述）
// Settings > API > anon public key をここに貼る
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd2ZkZ3V1dnZzZWRodndsZ3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzg3MDcsImV4cCI6MjA5NDg1NDcwN30.KUMd0GH02vBuJbuC8SYsZOXT6llicjECUMBOoehMikc';

// ---- セッション取得 ----
function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem('sb_session') || '{}');
    if (s.access_token && s.expires_at > Date.now()) return s;
    return null;
  } catch(e) { return null; }
}

// ---- ログイン済みか ----
function isLoggedIn() {
  return getSession() !== null;
}

// ---- プレミアムか ----
function isPremium() {
  try {
    const s = getSession();
    if (!s) return false;
    return s.is_premium === true;
  } catch(e) { return false; }
}

// ---- ログアウト ----
function logout() {
  localStorage.removeItem('sb_session');
  window.location.href = 'index.html';
}

// ---- ユーザー情報をヘッダーに反映 ----
function renderAuthHeader() {
  const area = document.getElementById('authArea');
  if (!area) return;
  const s = getSession();
  if (s && s.user) {
    const email = s.user.email || '';
    const premium = isPremium();
    area.innerHTML = `
      <div style="display:flex;align-items:center;gap:.5rem;font-size:11px;color:var(--ink3)">
        ${premium ? '<span style="background:var(--acc);color:#fff;padding:1px 7px;border-radius:2px;font-size:10px;font-weight:500">PRO</span>' : ''}
        <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${email}</span>
        <button onclick="logout()" style="font-size:11px;padding:2px 8px;border:0.5px solid var(--paper3);background:#fff;color:var(--ink3);cursor:pointer;border-radius:2px">ログアウト</button>
      </div>`;
  } else {
    area.innerHTML = `<a href="login.html" style="font-size:12px;padding:4px 12px;border:1px solid var(--acc);color:var(--acc);border-radius:2px;text-decoration:none;font-weight:500">ログイン</a>`;
  }
}

document.addEventListener('DOMContentLoaded', renderAuthHeader);
