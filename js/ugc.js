// ===== UGC（ユーザー投稿）管理 =====

// ---- 投稿 ----
async function submitUGC(formData) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const entry = {
    id,
    word:      formData.word.trim(),
    kana:      formData.kana.trim(),
    nuance:    formData.nuance.trim(),
    scene:     formData.scene.trim(),
    baAfter:   formData.baAfter.trim(),
    genre:     formData.genre,
    situation: formData.situation.trim(),
    authorName:formData.authorName.trim() || '匿名',
    status:    'pending',
    submittedAt: Date.now(),
  };
  await window.storage.set(`pending:${id}`, JSON.stringify(entry));
  return id;
}

// ---- 承認 ----
async function approveUGC(id) {
  const r = await window.storage.get(`pending:${id}`);
  if (!r) return false;
  const entry = JSON.parse(r.value);
  entry.status = 'approved';
  entry.approvedAt = Date.now();
  // ugc:単語:id で保存（検索時に単語で引っ張るため）
  await window.storage.set(`ugc:${entry.word}:${id}`, JSON.stringify(entry), true); // shared=true
  await window.storage.delete(`pending:${id}`);
  return true;
}

// ---- 却下 ----
async function rejectUGC(id) {
  await window.storage.delete(`pending:${id}`);
  return true;
}

// ---- 検索語に関連するUGC取得 ----
async function getRelatedUGC(word, limitGenre = 'all') {
  try {
    // ugc:単語: のプレフィックスで一致するものを取得
    const result = await window.storage.list(`ugc:${word}:`, true); // shared=true
    if (!result || !result.keys || result.keys.length === 0) return [];

    const items = [];
    for (const k of result.keys) {
      try {
        const r = await window.storage.get(k, true);
        if (r) {
          const entry = JSON.parse(r.value);
          if (limitGenre === 'all' || entry.genre === limitGenre) {
            items.push(entry);
          }
        }
      } catch(e) {}
    }
    // 新しい順にソート
    items.sort((a,b) => b.approvedAt - a.approvedAt);
    return items;
  } catch(e) {
    return [];
  }
}

// ---- pending一覧取得（管理者用）----
async function getPendingList() {
  try {
    const result = await window.storage.list('pending:');
    if (!result || !result.keys || result.keys.length === 0) return [];
    const items = [];
    for (const k of result.keys) {
      try {
        const r = await window.storage.get(k);
        if (r) items.push(JSON.parse(r.value));
      } catch(e) {}
    }
    items.sort((a,b) => a.submittedAt - b.submittedAt);
    return items;
  } catch(e) { return []; }
}

// ---- 承認済み一覧取得（管理者用）----
async function getApprovedList() {
  try {
    const result = await window.storage.list('ugc:', true);
    if (!result || !result.keys || result.keys.length === 0) return [];
    const items = [];
    for (const k of result.keys) {
      try {
        const r = await window.storage.get(k, true);
        if (r) items.push(JSON.parse(r.value));
      } catch(e) {}
    }
    items.sort((a,b) => b.approvedAt - a.approvedAt);
    return items;
  } catch(e) { return []; }
}

// ---- UGCセクションをレンダリング（index.html用）----
async function renderUGCSection(word, genre, containerEl) {
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
  const rest    = items.slice(3);

  let html = `
    <div class="ugc-section">
      <div class="sh">💬 他の作家の投稿（${items.length}件）</div>
      <div class="ugc-preview" id="ugcPreview">`;

  preview.forEach(item => {
    html += renderUGCCard(item);
  });

  html += `</div>`;

  if (rest.length > 0) {
    html += `<span class="ugc-more" onclick="showAllUGC('${word}','${genre}')">すべて見る（${items.length}件）▼</span>`;
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
  const gl = GENRE[item.genre]  || '';
  return `
    <div class="ugc-card">
      <div class="ugc-word">${item.word}<span style="font-size:11px;color:var(--ink3);margin-left:.5rem">${item.kana}</span></div>
      <div class="ugc-meta">
        <span class="tag ${gc}">${item.situation || gl}</span>
        <span style="margin-left:.5rem;font-size:11px;color:var(--ink3)">— ${item.authorName}</span>
      </div>
      <div class="ugc-scene">${item.scene}</div>
      ${item.baAfter ? `
        <div style="margin-top:8px;font-size:12px;color:var(--ink3)">Before → <span style="font-family:'Noto Serif JP',serif;color:var(--ink);font-size:13px">${item.baAfter}</span></div>
      ` : ''}
    </div>`;
}

async function showAllUGC(word, genre) {
  const items = window._ugcAll || await getRelatedUGC(word, genre);
  const preview = document.getElementById('ugcPreview');
  if (!preview) return;
  preview.innerHTML = items.map(item => renderUGCCard(item)).join('');
  const moreBtn = preview.nextElementSibling;
  if (moreBtn) moreBtn.remove();
}
