// ===== UGC（ユーザー投稿）管理 - Supabase版 =====

// ---- 投稿 ----
async function submitUGC(formData) {
  const res = await fetch('/api/ugc?action=submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word:       formData.word.trim(),
      kana:       formData.kana.trim(),
      nuance:     formData.nuance.trim(),
      scene:      formData.scene.trim(),
      ba_after:   formData.baAfter.trim(),
      genre:      formData.genre,
      situation:  formData.situation.trim(),
      author_name: formData.authorName.trim() || '匿名',
      link_kakuyomu: formData.linkKakuyomu || '',
      link_narou:    formData.linkNarou    || '',
      link_twitter:  formData.linkTwitter  || '',
    }),
  });
  if (!res.ok) throw new Error('投稿に失敗しました');
  return await res.json();
}

// ---- 承認待ち一覧取得 ----
async function getPendingList() {
  const res = await fetch('/api/ugc?action=pending');
  if (!res.ok) return [];
  return await res.json();
}

// ---- 承認 ----
async function approveUGC(id) {
  const res = await fetch('/api/ugc?action=approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return res.ok;
}

// ---- 却下 ----
async function rejectUGC(id) {
  const res = await fetch('/api/ugc?action=reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return res.ok;
}

// ---- 承認済み一覧取得（管理者用）----
async function getApprovedList() {
  const res = await fetch('/api/ugc?action=approved_list');
  if (!res.ok) return [];
  return await res.json();
}

// ---- 検索語に関連するUGC取得 ----
async function getRelatedUGC(word, genre = 'all') {
  let url = `/api/ugc?action=related&word=${encodeURIComponent(word)}`;
  if (genre !== 'all') url += `&genre=${genre}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return await res.json();
}

// ---- UGCセクションをレンダリング ----
async function renderUGCSection(word, genre, containerEl) {
  if (!containerEl) return;
  const items = await getRelatedUGC(word, genre);

  if (items.length === 0) {
    containerEl.innerHTML = `
      <div class="ugc-section">
        <div class="sh">💬 他の作家の投稿</div>
        <div class="ugc-empty">まだ投稿がありません。<a href="submit.html?word=${encodeURIComponent(word)}" style="color:var(--acc)">最初の投稿者になる →</a></div>
      </div>`;
    return;
  }

  const preview = items.slice(0, 3);
  let html = `
    <div class="ugc-section">
      <div class="sh">💬 他の作家の投稿（${items.length}件）</div>
      <div class="ugc-preview" id="ugcPreview">`;

  preview.forEach(item => { html += renderUGCCard(item); });
  html += `</div>`;

  if (items.length > 3) {
    html += `<span class="ugc-more" onclick="showAllUGC()">すべて見る（${items.length}件）▼</span>`;
  }

  html += `
      <div style="margin-top:.75rem">
        <a href="submit.html?word=${encodeURIComponent(word)}" style="font-size:12px;color:var(--ink3);text-decoration:none;border-bottom:1px dashed var(--paper3);padding-bottom:1px">
          ＋ この言葉の表現を投稿する
        </a>
      </div>
    </div>`;

  containerEl.innerHTML = html;
  window._ugcAll = items;
}

function renderUGCCard(item) {
  const gc = GENREC[item.genre] || 'gn';
  const gl = GENRE[item.genre] || '';
  return `
    <div class="ugc-card">
      <div class="ugc-word">${item.word}<span style="font-size:11px;color:var(--ink3);margin-left:.5rem">${item.kana}</span></div>
      <div class="ugc-meta">
        <span class="tag ${gc}">${item.situation || gl}</span>
        <span style="margin-left:.5rem;font-size:11px;color:var(--ink3)">— ${item.author_name}</span>
      </div>
      <div class="ugc-scene">${item.scene}</div>
      ${item.ba_after ? `
        <div style="margin-top:8px;font-size:12px;color:var(--ink3)">→ <span style="font-family:'Noto Serif JP',serif;color:var(--ink);font-size:13px">${item.ba_after}</span></div>
      ` : ''}
    </div>`;
}

function showAllUGC() {
  const items = window._ugcAll || [];
  const preview = document.getElementById('ugcPreview');
  if (!preview) return;
  preview.innerHTML = items.map(item => renderUGCCard(item)).join('');
  const moreBtn = preview.nextElementSibling;
  if (moreBtn && moreBtn.classList.contains('ugc-more')) moreBtn.remove();
}
