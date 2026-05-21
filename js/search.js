// ===== 検索・表示ロジック =====

let genre    = 'all';
let curWord  = '';
let allSyns  = [];
let selCard  = null;

// ---- ジャンル ----
function setGenre(g, btn) {
  genre = g;
  document.querySelectorAll('.gbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (curWord) doSearch();
}

function qs(w) {
  document.getElementById('si').value = w;
  doSearch();
}

// ---- 文章判定 ----
function isSentence(t) {
  if (/[がをにはでもとへのやをも]/.test(t)) return true;
  if (/する|した|してい|れる|られる|てい|ない|ます|です|だった|いた|って|った|んだ|いで|んで|めた|けた/.test(t)) return true;
  return false;
}

// ---- メイン検索 ----
async function doSearch() {
  // AI使用同意チェック
  const consent = document.getElementById('aiConsent');
  if (consent && !consent.checked) {
    document.getElementById('empty').style.display = 'none';
    document.getElementById('area').innerHTML = `
      <div style=\"text-align:center;padding:2.5rem 1rem;color:var(--ink3)\">\n        <div style=\"font-size:32px;margin-bottom:.75rem;opacity:.3\">🤖</div>\n        <div style=\"font-size:14px;color:var(--ink2);margin-bottom:.5rem\">AI使用に同意が必要です</div>\n        <div style=\"font-size:12px;color:var(--ink3)\">画面上の「AI使用に同意」にチェックを入れて検索してください。</div>\n      </div>
    `;
    return;
  }

  const val = document.getElementById('si').value.trim();
  if (!val) return;

  curWord = val;
  document.getElementById('empty').style.display = 'none';
  document.getElementById('area').innerHTML = '';
  document.getElementById('loading').style.display = 'block';

  try {
    // 1. Supabaseからデータを並行取得
    const [dbData, ugcData] = await Promise.all([
      fetch(`/api/words?action=get&word=${encodeURIComponent(val)}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/ugc?action=related&word=${encodeURIComponent(val)}`).then(r => r.ok ? r.json() : [])
    ]);

    // 2. 文章入力、またはSupabaseにデータが無い場合はAIに尋ねる
    let aiRes = null;
    const needAI = isSentence(val) || !dbData || !dbData.synonyms || dbData.synonyms.length === 0;
    
    if (needAI) {
      const prompt = `「${val}」の小説向け言い換え表現をジャンル「${genre}」に最適化してJSONで出力してください。`;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
      });
      if (res.ok) {
        const json = await res.json();
        aiRes = repairJSON(json.content || json.choices?.[0]?.message?.content || '{}');
      }
    }

    // 3. データの結合と処理
    let combined = [];
    if (dbData && dbData.synonyms) combined = [...dbData.synonyms];
    if (aiRes && aiRes.synonyms) combined = [...combined, ...aiRes.synonyms];

    // ジャンルフィルター
    if (genre !== 'all') {
      combined = combined.filter(s => s.genres && s.genres.includes(genre));
    }

    allSyns = combined;
    selCard = null;

    // 4. 表示レンダリング
    renderResults(val, combined, ugcData, dbData);

    // 5. 検索履歴に保存
    if (typeof saveMemory === 'function' && combined.length > 0) {
      saveMemory(val, combined);
    }

  } catch (e) {
    console.error(e);
    document.getElementById('area').innerHTML = `<p style="text-align:center;color:var(--ink3);font-size:13px;padding:2rem">エラーが発生しました。時間を置いて再度お試しください。</p>`;
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// ---- 結果表示レンダリング ----
function renderResults(word, syns, ugc, dbData) {
  let h = `<div class="rh"><span class="rw">「${word}」</span>の言い換え</div>`;

  // UGC（ユーザー投稿）があれば差し込み
  if (ugc && ugc.length > 0) {
    h += `<div class="ugc-section-title">読者からの投稿表現（${ugc.length}件）</div><div class="ugc-grid">`;
    ugc.forEach(item => {
      const gc = GENREC[item.genre] || 'gn';
      const gl = GENRE[item.genre] || '';
      h += `
        <div class="ugc-card">
          <div class="ugc-meta"><span class="tag ${gc}">${item.situation || gl}</span> — ${item.author_name}</div>
          <div class="ugc-scene">${item.scene}</div>
          ${item.ba_after ? `<div class="ugc-after">→ ${item.ba_after}</div>` : ''}
        </div>`;
    });
    h += `</div>`;
  }

  // Before → After 例文があれば表示
  if (dbData && dbData.beforeafter && dbData.beforeafter.length > 0) {
    h += `<div class="ba-section-title">Before → After 例文</div>`;
    dbData.beforeafter.forEach(b => {
      h += `
        <div class="ba-card">
          <div class="ba-b"><span>削</span>${b.before_text}</div>
          <div class="ba-a"><span>推</span>${b.after_text}</div>
        </div>`;
    });
  }

  // 類語カード一覧
  if (syns.length === 0) {
    h += `<p style="color:var(--ink3);font-size:13px;padding:2rem 0">該当する表現が見つかりませんでした。別の言葉で検索するか、ジャンルを「すべて」にしてみてください。</p>`;
  } else {
    h += `<div class="syns-grid">`;
    syns.forEach((s, idx) => {
      let gt = '';
      if (s.genres) s.genres.forEach(g => { gt += `<span class="tag ${GENREC[g]||'gn'}">${GENRE[g]||g}</span>`; });
      
      h += `
        <div class="syn-card" id="c${idx}" onclick="showDetailSent(${idx}, 0)">
          <div class="sc-w">${s.word}</div>
          <div class="sc-k">${s.kana || ''}</div>
          <div class="sc-n">${s.nuance || ''}</div>
          <div class="tags">${gt}</div>
        </div>`;
    });
    h += `</div><div class="detail" id="det0"></div>`;
  }

  // 投稿誘導リンク
  h += `
    <div style="margin-top:2rem;text-align:center">
      <a href="submit.html?word=${encodeURIComponent(word)}" class="submit-link">
        ＋「${word}」の新しい言い換え表現を投稿する
      </a>
    </div>`;

  document.getElementById('area').innerHTML = h;
}

function showDetailSent(idx, ei) {
  const s = allSyns[idx]; if (!s) return;
  if (selCard !== null) document.getElementById(`c${selCard}`)?.classList.remove('sel');
  selCard = idx;
  document.getElementById(`c${idx}`)?.classList.add('sel');
  const d = document.getElementById(`det${ei}`);
  if (d) {
    d.innerHTML = `
      <div class="dw">${s.word}</div>
      <div class="dk">${s.kana || ''}</div>
      <div class="dd">${s.desc || s.description || ''}</div>
      <div class="ds">${s.scene || ''}</div>
    `;
    d.classList.add('show');
  }
}

// ---- 不完全なJSONの簡易修復 ----
function repairJSON(str) {
  try { return JSON.parse(str); } catch (e) {}
  let clean = str.replace(/```json/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(clean); } catch (e) { return {}; }
}
