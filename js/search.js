// ===== 検索・表示ロジック =====
// ★ Stripeの決済リンクができたらここを変更するだけでOK
const STRIPE_URL = 'https://buy.stripe.com/3cI00j4Lb2zfdm98f1bV603';
let genre   = 'all';
let curWord = '';
let allSyns = [];
let selCard = null;

function setGenre(g, btn) {
  genre = g;
  document.querySelectorAll('.gbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (curWord) doSearchNoCount();
}

function qs(w) {
  document.getElementById('si').value = w;
  doSearch();
}

function isSentence(t) { return false; }

// ---- プレミアム判定 ----
function isPremiumUser() {
  try {
    const s = JSON.parse(localStorage.getItem('sb_session') || '{}');
    if (!s.access_token) return false;
    if (s.expires_at && s.expires_at < Date.now()) return false;
    return s.is_premium === true;
  } catch(e) { return false; }
}

// ---- 検索回数チェック ----
function getSearchCount() {
  try {
    const data = JSON.parse(localStorage.getItem('searchLimit') || '{}');
    const today = new Date().toDateString();
    if (data.date !== today) return 0;
    return data.count || 0;
  } catch(e) { return 0; }
}

function addSearchCount() {
  try {
    const today = new Date().toDateString();
    const count = getSearchCount() + 1;
    localStorage.setItem('searchLimit', JSON.stringify({date: today, count}));
  } catch(e) {}
}

function showLimitScreen() {
  document.getElementById('empty').style.display = 'none';
  const loggedIn = !!JSON.parse(localStorage.getItem('sb_session') || '{}').access_token;
  const titleMsg = loggedIn
    ? '本日の無料検索回数（3回）に達しました'
    : '無料検索回数（1回）に達しました';
  const subMsg = loggedIn
    ? '明日0時にリセットされます<br>または有料プランで無制限に使えます'
    : 'ログインすると1日3回まで無料で検索できます<br>さらに有料プランで無制限に使えます';
  document.getElementById('area').innerHTML = `
    <div style="text-align:center;padding:2.5rem 1rem;max-width:400px;margin:0 auto">
      <div style="font-size:36px;margin-bottom:.75rem">🔒</div>
      <div style="font-family:'Noto Serif JP',serif;font-size:18px;font-weight:500;color:var(--ink);margin-bottom:.5rem">${titleMsg}</div>
      <div style="font-size:13px;color:var(--ink3);margin-bottom:1.5rem;line-height:1.8">${subMsg}</div>
      <div style="background:#fff;border:1px solid var(--paper3);border-top:3px solid var(--acc);border-radius:4px;padding:1.5rem;max-width:320px;margin:0 auto 1rem">
        <div style="font-size:11px;font-weight:500;color:var(--acc);letter-spacing:.08em;margin-bottom:.5rem">PRO プラン</div>
        <div style="font-family:'Noto Serif JP',serif;font-size:32px;font-weight:500;color:var(--acc);margin-bottom:.25rem">月額298円</div>
        <div style="font-size:11px;color:var(--ink3);margin-bottom:1.25rem">税込 / いつでも解約可能</div>
        <div style="text-align:left;margin-bottom:1.25rem;display:flex;flex-direction:column;gap:8px">
          <div style="font-size:12px;color:var(--ink2);display:flex;align-items:center;gap:.4rem">
            <span style="color:var(--acc)">✓</span> 検索回数が無制限
          </div>
          <div style="font-size:12px;color:var(--ink2);display:flex;align-items:center;gap:.4rem">
            <span style="color:var(--acc)">✓</span> 全ジャンル使い放題
          </div>
          <div style="font-size:12px;color:var(--ink2);display:flex;align-items:center;gap:.4rem">
            <span style="color:var(--acc)">✓</span> あの一言が、物語を変える
          </div>
          <div style="font-size:12px;color:var(--ink2);display:flex;align-items:center;gap:.4rem">
            <span style="color:var(--acc)">✓</span> 1日10円で、表現の幅が広がる
          </div>
        </div>
        ${loggedIn
          ? `<a href="${STRIPE_URL}" target="_blank" rel="noopener" style="display:block;width:100%;padding:.85rem;background:var(--acc);color:#fff;border:none;font-size:14px;font-weight:500;cursor:pointer;border-radius:2px;font-family:'Zen Kaku Gothic New',sans-serif;text-align:center;text-decoration:none;box-sizing:border-box">有料プランに登録する — 月額298円</a>`
          : `<button onclick="window.location.href='login.html'" style="width:100%;padding:.85rem;background:var(--acc);color:#fff;border:none;font-size:14px;font-weight:500;cursor:pointer;border-radius:2px;font-family:'Zen Kaku Gothic New',sans-serif">無料登録して続ける</button>
             <div style="font-size:11px;color:var(--ink3);margin-top:.5rem">登録無料・有料プランは任意です</div>`
        }
      </div>
      <div style="font-size:11px;color:var(--ink3)">明日また3回無料で使えます</div>

      <div style="margin-top:1.5rem;padding:1.25rem;background:#fff;border:1px solid var(--paper3);border-radius:4px;max-width:320px;margin-left:auto;margin-right:auto;margin-top:1rem">
        <div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:.5rem">✍️ 表現を投稿してみませんか？</div>
        <div style="font-size:11px;color:var(--ink3);line-height:1.8;margin-bottom:.75rem">投稿や閲覧は完全無料。なろう・カクヨム・Xのリンクも一緒に掲載できます。あなたの表現が他の作家の力になります。</div>
        <a href="/submit.html" style="display:block;width:100%;padding:.6rem;background:var(--paper2);color:var(--acc);border:1px solid var(--acc);font-size:13px;font-weight:500;text-align:center;text-decoration:none;border-radius:2px;box-sizing:border-box;font-family:'Zen Kaku Gothic New',sans-serif">表現を投稿する（無料）</a>
      </div>
    </div>`;
}

// ジャンル切り替え・関連ワードクリック時はカウントしない
async function doSearchNoCount() {
  const _addCount = addSearchCount;
  window.addSearchCount = function(){};
  await doSearch();
  window.addSearchCount = _addCount;
}

async function doSearch() {
  const consent = document.getElementById('aiConsent');
  if (consent && !consent.checked) {
    document.getElementById('empty').style.display = 'none';
    document.getElementById('area').innerHTML = `
      <div style="text-align:center;padding:2.5rem 1rem;color:var(--ink3)">
        <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">🤖</div>
        <div style="font-size:14px;color:var(--ink2);margin-bottom:.5rem">AI使用に同意が必要です</div>
        <div style="font-size:13px;line-height:1.8">上の「AI使用に同意」にチェックを入れると<br>言い換え表現を検索できます</div>
      </div>`;
    return;
  }

  // 回数制限チェック（プレミアムは除外）
  if (!isPremiumUser()) {
    const loggedIn = !!JSON.parse(localStorage.getItem('sb_session') || '{}').access_token;
    const limit = loggedIn ? 3 : 1;
    const count = getSearchCount();
    if (count >= limit) {
      const input = document.getElementById('si').value.trim();
      if (!input) { showLimitScreen(); return; }
      curWord = input;
      document.getElementById('empty').style.display = 'none';
      showLimitScreen();
      const ugcDiv = document.createElement('div');
      ugcDiv.id = 'ugcContainer';
      ugcDiv.style.maxWidth = '760px';
      ugcDiv.style.margin = '0 auto';
      const area = document.getElementById('area');
      if (area) area.appendChild(ugcDiv);
      if (typeof renderUGCSection === 'function') {
        renderUGCSection(input, genre, ugcDiv);
      }
      return;
    }
  }

  const input = document.getElementById('si').value.trim();
  if (!input) return;
  curWord = input;
  document.getElementById('empty').style.display = 'none';
  document.getElementById('area').innerHTML = '';
  setLoading(true, '語彙の海を探索中');
  await aiWord(input);
}

function setLoading(on, msg = '') {
  const el = document.getElementById('loading');
  if (!el) return;
  el.classList.toggle('show', on);
  if (msg) {
    const lm = document.getElementById('lmsg');
    if (lm) lm.textContent = msg;
  }
}

// ---- 統一描画関数 ----
function renderResult(word, data) {
  setLoading(false);
  allSyns = [];
  selCard = null;
  let syns  = data.synonyms || [];
  let bas   = data.beforeafter || [];
  let exprs = data.expressions || [];
  if (genre !== 'all') {
    const fs = syns.filter(s => (s.genres||[]).includes(genre));
    if (fs.length) syns = fs;
    const fb = bas.filter(b => b.genre === genre);
    if (fb.length) bas = fb;
  }
  allSyns = syns;
  const gb = genre !== 'all' ? `<span class="rbadge">${GENRE[genre]||genre}向けを優先</span>` : '';
  let h = `<div class="rh"><span class="rw">「${word}」</span><span class="rm">の言い換え ${syns.length}件</span>${gb}</div>`;
  if (bas.length) {
    h += `<div class="sh">ビフォー → アフター 例文集（${bas.length}件）</div><div class="ba-section"><div class="ba-grid">`;
    bas.forEach(b => {
      const gc = GENREC[b.genre] || 'gn';
      h += `<div class="ba-card">
        <div class="ba-head">
          <span class="sit-tag tag ${gc}">${b.sit||''}</span>
          <button class="ba-copy" onclick="cpText('${escQ(b.after)}',this)">コピー</button>
        </div>
        <div class="ba-body">
          <div class="ba-b">${b.before}</div>
          <div class="ba-arrow">→</div>
          <div class="ba-a" oncontextmenu="longCopy(event,'${escQ(b.after)}')">${b.after}</div>
        </div>
        ${b.note ? `<div class="ba-note">${b.note}</div>` : ''}
      </div>`;
    });
    h += `</div></div>`;
  }
  if (exprs.length) {
    h += `<div class="sh">情景表現フレーズ</div><div class="expr-list">`;
    exprs.forEach(e => { h += `<div class="expr">${e}</div>`; });
    h += `</div>`;
  }
  if (syns.length) {
    h += `<div class="sh">ニュアンス比較カード（クリックで詳細）</div><div class="nc-grid">`;
    syns.forEach((s, i) => {
      const uc = (s.usecases||[]).map(u => `<span class="uc">📌 ${u}</span>`).join(' ');
      const gt = (s.genres||[]).slice(0,2).map(g => `<span class="tag ${GENREC[g]||'gn'}">${GENRE[g]||g}</span>`).join('');
      h += `<div class="nc" id="c${i}" onclick="showDetail(${i})">
        <div class="nc-w">${s.word}</div><div class="nc-k">${s.kana}</div>
        <div class="brow"><span class="blabel">強度</span><div class="bbar"><div class="bfill" style="width:${s.intensity||50}%"></div></div></div>
        <div class="brow"><span class="blabel">詩的さ</span><div class="bbar"><div class="bfill" style="width:${s.lyricism||50}%"></div></div></div>
        <div class="nc-n">${s.nuance}</div>
        <div class="tags"><span class="tag ${TONEC[s.tone]||'tm'}">${TONE[s.tone]||s.tone}</span>${gt}</div>
        ${uc ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px">${uc}</div>` : ''}
      </div>`;
    });
    h += `</div>`;
    h += `<div class="detail" id="detail">
      <div class="dw" id="dw"></div><div class="dk" id="dk"></div>
      <div class="dd" id="dd"></div><div class="ds" id="ds"></div>
      <div class="dacts">
        <button class="cbtn" id="cb1" onclick="cp('dw','cb1')">単語をコピー</button>
        <button class="cbtn" id="cb2" onclick="cp('ds','cb2')">例文をコピー</button>
      </div>
    </div>`;
  }
  h += `<div id="ugcContainer"></div>`;
  h += `<div style="text-align:center;padding:2rem 0 1rem;border-top:1px solid var(--paper3);margin-top:1.5rem">
    <p style="font-size:13px;color:var(--ink3);margin-bottom:1rem">他の言葉も調べてみましょう</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:1rem">
      ${getRelatedWords(word).map(w=>`<span onclick="qs('${w}')" style="font-family:'Noto Serif JP',serif;font-size:14px;color:var(--ink2);padding:5px 14px;border:0.5px solid var(--paper3);border-radius:2px;cursor:pointer;background:#fff">${w}</span>`).join('')}
    </div>
    <button onclick="document.getElementById('si').focus();document.getElementById('si').select()" style="font-size:13px;padding:8px 24px;background:var(--acc);color:#fff;border:none;cursor:pointer;letter-spacing:.06em;font-family:'Zen Kaku Gothic New',sans-serif">
      別の言葉を検索する
    </button>
  </div>`;
  document.getElementById('area').innerHTML = h;
  if (typeof renderUGCSection === 'function') {
    const ugcEl = document.getElementById('ugcContainer');
    if (ugcEl) renderUGCSection(word, genre, ugcEl);
  }
}

function showDetail(i) {
  const s = allSyns[i]; if (!s) return;
  if (selCard !== null) document.getElementById(`c${selCard}`)?.classList.remove('sel');
  selCard = i;
  document.getElementById(`c${i}`)?.classList.add('sel');
  document.getElementById('dw').textContent = s.word;
  document.getElementById('dk').textContent = s.kana;
  document.getElementById('dd').textContent = s.desc  || '';
  document.getElementById('ds').textContent = s.scene || '';
  document.getElementById('detail').classList.add('show');
  ['cb1','cb2'].forEach(id => {
    const b = document.getElementById(id);
    if (b) { b.textContent = id==='cb1'?'単語をコピー':'例文をコピー'; b.classList.remove('ok'); }
  });
}

function cp(id, bid) {
  navigator.clipboard.writeText(document.getElementById(id).textContent).then(() => {
    const b = document.getElementById(bid);
    b.textContent = '✓ コピー済み';
    b.style.background = 'var(--acc)'; b.style.color = '#fff'; b.style.borderColor = 'var(--acc)';
    setTimeout(() => {
      b.textContent = id==='dw'?'単語をコピー':'例文をコピー';
      b.style.background = ''; b.style.color = ''; b.style.borderColor = '';
    }, 1800);
  });
}

function cpText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ コピー済み';
    btn.style.background = 'var(--acc)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--acc)';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = '';
    }, 1800);
  });
}

function longCopy(e, text) {
  e.preventDefault();
  navigator.clipboard.writeText(text).then(() => { showToast('コピーしました'); });
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#1a1714;color:#fff;padding:.5rem 1.25rem;font-size:13px;border-radius:2px;z-index:999;opacity:0;transition:opacity .2s'; document.body.appendChild(t); }
  t.textContent = msg; t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 2000);
}

const RELATED_MAP = {
  '雨':['夜','風','雪','闇','沈黙'], '夜':['雨','闇','風','沈黙','孤独'],
  '風':['雨','雪','夜','儚い','揺れる'], '雪':['雨','風','闇','儚い','静か'],
  '闇':['夜','恐怖','孤独','沈黙','消える'], '光':['輝く','明るい','嬉しい','憧れる','燃える'],
  '悲しい':['切ない','寂しい','苦しい','泣く','孤独'], '嬉しい':['笑う','輝く','明るい','好き','温かい'],
  '切ない':['悲しい','寂しい','恋しい','儚い','迷う'], '寂しい':['孤独','悲しい','切ない','一人','沈黙'],
  '苦しい':['悲しい','怒り','恐怖','迷う','叫ぶ'], '怒り':['叫ぶ','苦しい','憎い','震える','恐怖'],
  '恐怖':['怖い','震える','逃げる','叫ぶ','闇'], '孤独':['寂しい','一人','沈黙','切ない','儚い'],
  '沈黙':['孤独','静か','一人','寂しい','夜'], '走る':['逃げる','叫ぶ','震える','焦る','歩く'],
  '泣く':['悲しい','切ない','苦しい','寂しい','孤独'], '笑う':['嬉しい','明るい','好き','輝く','温かい'],
  '叫ぶ':['怒り','恐怖','苦しい','震える','走る'],
};

function getRelatedWords(word) {
  return RELATED_MAP[word] || Object.keys(RELATED_MAP).filter(w=>w!==word).slice(0,5);
}

function escQ(s) { return String(s||'').replace(/'/g, "\\'"); }

function safeParseJSON(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('空のレスポンス');
  const cleaned = raw.replace(/```json/g,'').replace(/```/g,'').trim();
  if (!cleaned) throw new Error('空のレスポンス');
  return JSON.parse(repairJSON(cleaned));
}

// ---- フェーズ1：BA例文だけ先に表示 ----
function renderPhase1(word, data) {
  let bas = (data.beforeafter || []);
  if (genre !== 'all') {
    const filtered = bas.filter(b => b.genre === genre);
    if (filtered.length) bas = filtered;
  }
  if (!bas.length) {
    document.getElementById('area').innerHTML = '<div id="phase2Area"></div>';
    return;
  }
  let h = `<div class="rh"><span class="rw">「${word}」</span><span class="rm">の言い換え</span></div>`;
  h += `<div class="sh">ビフォー → アフター 例文集（${bas.length}件）</div><div class="ba-section"><div class="ba-grid">`;
  bas.forEach(b => {
    const gc = GENREC[b.genre] || 'gn';
    h += `<div class="ba-card" style="animation:fi .3s ease">
      <div class="ba-head">
        <span class="sit-tag tag ${gc}">${b.sit||''}</span>
        <button class="ba-copy" onclick="cpText('${escQ(b.after)}',this)">コピー</button>
      </div>
      <div class="ba-body">
        <div class="ba-b">${b.before}</div>
        <div class="ba-arrow">→</div>
        <div class="ba-a">${b.after}</div>
      </div>
      ${b.note ? `<div class="ba-note">${b.note}</div>` : ''}
    </div>`;
  });
  h += `</div></div><div id="phase2Area"></div>`;
  document.getElementById('area').innerHTML = h;
}

// ---- フェーズ2：ニュアンスカード＋情景表現を追記 ----
function renderPhase2(word, phase1, phase2) {
  const syns  = (phase2.synonyms || []);
  const exprs = (phase2.expressions || []);
  allSyns = syns;
  let h = '';
  if (exprs.length) {
    h += `<div class="sh">情景表現フレーズ</div><div class="expr-list">`;
    exprs.forEach(e => { h += `<div class="expr" style="animation:fi .3s ease">${e}</div>`; });
    h += `</div>`;
  }
  if (syns.length) {
    h += `<div class="sh">ニュアンス比較カード（クリックで詳細）</div><div class="nc-grid">`;
    syns.forEach((s, i) => {
      const uc = (s.usecases||[]).map(u => `<span class="uc">📌 ${u}</span>`).join(' ');
      const gt = (s.genres||[]).slice(0,2).map(g => `<span class="tag ${GENREC[g]||'gn'}">${GENRE[g]||g}</span>`).join('');
      h += `<div class="nc" id="c${i}" onclick="showDetail(${i})" style="animation:fi .3s ease">
        <div class="nc-w">${s.word}</div><div class="nc-k">${s.kana}</div>
        <div class="brow"><span class="blabel">強度</span><div class="bbar"><div class="bfill" style="width:${s.intensity||50}%"></div></div></div>
        <div class="brow"><span class="blabel">詩的さ</span><div class="bbar"><div class="bfill" style="width:${s.lyricism||50}%"></div></div></div>
        <div class="nc-n">${s.nuance}</div>
        <div class="tags"><span class="tag ${TONEC[s.tone]||'tm'}">${TONE[s.tone]||s.tone}</span>${gt}</div>
        ${uc ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px">${uc}</div>` : ''}
      </div>`;
    });
    h += `</div>`;
    h += `<div class="detail" id="detail">
      <div class="dw" id="dw"></div><div class="dk" id="dk"></div>
      <div class="dd" id="dd"></div><div class="ds" id="ds"></div>
      <div class="dacts">
        <button class="cbtn" id="cb1" onclick="cp('dw','cb1')">単語をコピー</button>
        <button class="cbtn" id="cb2" onclick="cp('ds','cb2')">例文をコピー</button>
      </div>
    </div>`;
  }
  h += `<div id="ugcContainer"></div>`;
  h += `<div style="text-align:center;padding:2rem 0 1rem;border-top:1px solid var(--paper3);margin-top:1.5rem">
    <p style="font-size:13px;color:var(--ink3);margin-bottom:1rem">他の言葉も調べてみましょう</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:1rem">
      ${getRelatedWords(word).map(w=>`<span onclick="qs('${w}')" style="font-family:'Noto Serif JP',serif;font-size:14px;color:var(--ink2);padding:5px 14px;border:0.5px solid var(--paper3);border-radius:2px;cursor:pointer;background:#fff">${w}</span>`).join('')}
    </div>
    <button onclick="document.getElementById('si').focus();document.getElementById('si').select()" style="font-size:13px;padding:8px 24px;background:var(--acc);color:#fff;border:none;cursor:pointer;letter-spacing:.06em;font-family:'Zen Kaku Gothic New',sans-serif">
      別の言葉を検索する
    </button>
  </div>`;
  const p2 = document.getElementById('phase2Area');
  if (p2) {
    p2.innerHTML = h;
  } else {
    const area = document.getElementById('area');
    if (area) area.innerHTML += h;
  }
  if (typeof renderUGCSection === 'function') {
    const ugcEl = document.getElementById('ugcContainer');
    if (ugcEl) renderUGCSection(word, genre, ugcEl);
  }
}

// ---- AI単語検索（2段階表示） ----
async function aiWord(word) {
  const gk   = genre !== 'all' ? genre : 'all';
  const gn   = GENRE[gk] || '全ジャンル';
  const inst = gk !== 'all' ? `ジャンルは${gn}固定。` : '';
  const sits = gk !== 'all' ? GLABEL[gk].slice(0,5) : ['恋愛・失恋','恋愛・成就','異世界・幕開け','ホラー・緊迫','歴史・冒頭'];
  const sitEx = sits.map((s,i) => `{"sit":"${s}","genre":"${gk!=='all'?gk:['romance','fantasy','horror','historical','general'][i]||'general'}","before":"平凡な文","after":"豊かな表現","note":"15字"}`).join(',');

  // ===== Supabaseキャッシュチェック =====
  try {
    setLoading(true, '検索中...');
    const cacheRes = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({word, genre: gk, max_tokens: 1, messages: []})
    });
    if (cacheRes.ok) {
      const cacheData = await cacheRes.json();
      if (cacheData.cached && cacheData.data) {
        addSearchCount();
        setLoading(false);
        renderResult(word, cacheData.data);
        renderMemoryBar();
        const ad = document.getElementById('adSlot1'); if (ad) ad.style.display = 'block';
        return;
      }
    }
  } catch(e) {}

  // ===== 第1フェーズ：BA例文 =====
  addSearchCount();
  const prompt1 = `小説作家向け。「${word}」のビフォーアフター例文5件。${inst}JSONのみ:{"beforeafter":[${sitEx}]}`;
  let phase1 = { beforeafter: [] };
  let phase2 = { synonyms: [], expressions: [] };

  try {
    setLoading(true, 'AIが例文を生成中...');
    const r1 = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({max_tokens: 1200, messages: [{role:'user',content:prompt1}]})
    });
    const j1 = await r1.json();
    if (!r1.ok || j1.error) throw new Error((j1.error && j1.error.message) || 'API1エラー');
    const raw1 = (j1.content||[]).map(x => x.text||'').join('');
    try { phase1 = safeParseJSON(raw1); } catch(pe) { phase1 = { beforeafter: [] }; }

    setLoading(false);
    renderPhase1(word, phase1);

    // ===== 第2フェーズ：ニュアンスカード＋情景表現 =====
    const prompt2 = `小説作家向け。「${word}」の言い換え5語と情景表現7個。${inst}JSONのみ:{"synonyms":[{"word":"語","kana":"読み","nuance":"15字","tone":"poetic","genres":["${gk!=='all'?gk:'romance'}"],"intensity":70,"lyricism":60,"usecases":["シーン"],"desc":"20字","scene":"25字"},{"word":"語2","kana":"読み","nuance":"15字","tone":"modern","genres":["${gk!=='all'?gk:'general'}"],"intensity":50,"lyricism":50,"usecases":["シーン"],"desc":"20字","scene":"25字"},{"word":"語3","kana":"読み","nuance":"15字","tone":"classical","genres":["${gk!=='all'?gk:'fantasy'}"],"intensity":80,"lyricism":70,"usecases":["シーン"],"desc":"20字","scene":"25字"},{"word":"語4","kana":"読み","nuance":"15字","tone":"sensory","genres":["${gk!=='all'?gk:'horror'}"],"intensity":85,"lyricism":45,"usecases":["シーン"],"desc":"20字","scene":"25字"},{"word":"語5","kana":"読み","nuance":"15字","tone":"modern","genres":["${gk!=='all'?gk:'historical'}"],"intensity":60,"lyricism":80,"usecases":["シーン"],"desc":"20字","scene":"25字"}],"expressions":["表現1","表現2","表現3","表現4","表現5","表現6","表現7"]}`;

    const loadingEl = document.createElement('div');
    loadingEl.id = 'phase2Loading';
    loadingEl.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--ink3);font-size:12px;letter-spacing:.08em"><span class="dot"></span><span class="dot"></span><span class="dot"></span><div style="margin-top:.4rem">類語・情景表現を生成中...</div></div>';
    const areaEl = document.getElementById('area');
    if (areaEl) areaEl.appendChild(loadingEl);

    const r2 = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({max_tokens: 1800, word, genre: gk, beforeafter: phase1.beforeafter||[], messages: [{role:'user',content:prompt2}]})
    });
    const p2el = document.getElementById('phase2Loading');
    if (p2el) p2el.remove();

    const j2 = await r2.json();
    if (!r2.ok || j2.error) throw new Error((j2.error && j2.error.message) || 'API2エラー');
    const raw2 = (j2.content||[]).map(x => x.text||'').join('');
    try { phase2 = safeParseJSON(raw2); } catch(pe) { phase2 = { synonyms: [], expressions: [] }; }

    renderPhase2(word, phase1, phase2);

    await saveMemory(word, { synonyms: phase2.synonyms||[], expressions: phase2.expressions||[], beforeafter: phase1.beforeafter||[] });
    renderMemoryBar();
    const ad = document.getElementById('adSlot1'); if (ad) ad.style.display = 'block';

  } catch(e) {
    setLoading(false);
    document.getElementById('area').innerHTML = `<p style="text-align:center;padding:2rem;color:var(--ink3);font-size:13px">エラー: ${e.message}</p>`;
  }
}

function repairJSON(str) {
  if (typeof str !== 'string') return '{}';
  str = str.replace(/```json/g,'').replace(/```/g,'').trim();
  const st = []; let inS = false, esc = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (esc) { esc=false; continue; }
    if (c==='\\'&&inS) { esc=true; continue; }
    if (c==='"') { inS=!inS; continue; }
    if (inS) continue;
    if (c==='{') st.push('}');
    else if (c==='[') st.push(']');
    else if (c==='}'||c===']') st.pop();
  }
  let r = str;
  if (inS) r += '"';
  while (st.length) r += st.pop();
  return r;
}

async function saveMemory(word, data) {
  try { localStorage.setItem('mem:'+word, JSON.stringify({word, data, savedAt:Date.now()})); } catch(e){}
}

async function loadMemory(word) {
  try { const v = localStorage.getItem('mem:'+word); return v ? JSON.parse(v).data : null; } catch(e){ return null; }
}

document.addEventListener('DOMContentLoaded', () => {
  const si = document.getElementById('si');
  if (si) si.addEventListener('keydown', e => { if(e.key==='Enter') doSearch(); });
  const s = sessionStorage.getItem('autoSearch');
  if (s) { sessionStorage.removeItem('autoSearch'); if (si) si.value = s; doSearch(); }
  renderMemoryBar();
});

function renderMemoryBar() {
  const bar = document.getElementById('memoryBar');
  if (!bar) return;
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('mem:'));
    if (keys.length === 0) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    bar.innerHTML = keys.slice(-6).reverse().map(function(k) {
      const word = k.replace('mem:','');
      return '<span class="mem-chip" onclick="qs(\'' + word + '\')">' + word + ' <span onclick="event.stopPropagation();localStorage.removeItem(\'' + k + '\');renderMemoryBar()" style="color:var(--ink3);font-size:10px">✕</span></span>';
    }).join('');
  } catch(e) {}
}
