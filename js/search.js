// ===== 検索・表示ロジック =====

let genre   = 'all';
let curWord = '';
let allSyns = [];
let selCard = null;

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

function isSentence(t) {
  return false;
}

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
  document.getElementById('area').innerHTML = `
    <div style="text-align:center;padding:2.5rem 1rem">
      <div style="font-size:36px;margin-bottom:.75rem">🔒</div>
      <div style="font-family:'Noto Serif JP',serif;font-size:18px;font-weight:500;color:var(--ink);margin-bottom:.5rem">本日の無料検索回数（3回）に達しました</div>
      <div style="font-size:13px;color:var(--ink3);margin-bottom:1.5rem;line-height:1.8">明日0時にリセットされます<br>または有料プランで無制限に使えます</div>
      <div style="background:#fff;border:1px solid var(--paper3);border-radius:4px;padding:1.25rem;max-width:300px;margin:0 auto 1rem">
        <div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:.5rem">有料プラン</div>
        <div style="font-family:'Noto Serif JP',serif;font-size:28px;font-weight:500;color:var(--acc);margin-bottom:.5rem">月額300円</div>
        <div style="font-size:12px;color:var(--ink3);margin-bottom:1rem">検索無制限・全機能使い放題</div>
        <button onclick="window.location.href='login.html'" style="width:100%;padding:.75rem;background:var(--acc);color:#fff;border:none;font-size:14px;font-weight:500;cursor:pointer;border-radius:2px;font-family:'Zen Kaku Gothic New',sans-serif">
          ログイン / 新規登録
        </button>
        <div style="font-size:11px;color:var(--ink3);margin-top:.5rem">登録後、有料プランにお申し込みください</div>
      </div>
      <div style="font-size:11px;color:var(--ink3)">明日また3回無料で使えます</div>
    </div>`;
}

async function doSearch() {
  console.log("検索処理が開始されました"); // これを一番上に追加
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

  // プレミアムなら制限なし
  if (!isPremiumUser()) {
    const count = getSearchCount();
    if (count >= 3) {
      showLimitScreen();
      return;
    }
  }

  const input = document.getElementById('si').value.trim();
  if (!input) return;
  curWord = input;
  document.getElementById('empty').style.display = 'none';
  document.getElementById('area').innerHTML = '';
  setLoading(true, '語彙の海を探索中');
  if (isSentence(input)) {
    await sentenceSearch(input);
  } else {
    await aiWord(input);
  }
}

function setLoading(on, msg = '') {
  const el = document.getElementById('loading');
  el.classList.toggle('show', on);
  if (msg) document.getElementById('lmsg').textContent = msg;
}

async function renderWord(word, data) {
  setLoading(false);
  allSyns = [];
  selCard = null;

  let syns = data.synonyms || [];
  let bas  = data.beforeafter || [];

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

  if ((data.expressions||[]).length) {
    h += `<div class="sh">情景表現フレーズ</div><div class="expr-list">`;
    data.expressions.forEach(e => { h += `<div class="expr">${e}</div>`; });
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
      ${getRelatedWords(word).map(w=>`<span onclick="qs('${w}')" style="font-family:'Noto Serif JP',serif;font-size:14px;color:var(--ink2);padding:5px 14px;border:0.5px solid var(--paper3);border-radius:2px;cursor:pointer;background:#fff" onmouseover="this.style.borderColor='var(--acc)';this.style.color='var(--acc)'" onmouseout="this.style.borderColor='var(--paper3)';this.style.color='var(--ink2)'">${w}</span>`).join('')}
    </div>
    <button onclick="document.getElementById('si').focus();document.getElementById('si').select()" style="font-size:13px;padding:8px 24px;background:var(--acc);color:#fff;border:none;cursor:pointer;letter-spacing:.06em;font-family:'Zen Kaku Gothic New',sans-serif">
      別の言葉を検索する
    </button>
  </div>`;

  document.getElementById('area').innerHTML = h;
  await renderUGCSection(word, genre, document.getElementById('ugcContainer'));
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
    b.style.background = 'var(--acc)';
    b.style.color = '#fff';
    b.style.borderColor = 'var(--acc)';
    setTimeout(() => {
      b.textContent = id==='dw'?'単語をコピー':'例文をコピー';
      b.style.background = '';
      b.style.color = '';
      b.style.borderColor = '';
    }, 1800);
  });
}

function cpText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ コピー済み';
    btn.style.background = 'var(--acc)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--acc)';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
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
  '雨':['夜','風','雪','闇','沈黙'],
  '夜':['雨','闇','風','沈黙','孤独'],
  '風':['雨','雪','夜','儚い','揺れる'],
  '雪':['雨','風','闇','儚い','静か'],
  '闇':['夜','恐怖','孤独','沈黙','消える'],
  '光':['輝く','明るい','嬉しい','憧れる','燃える'],
  '悲しい':['切ない','寂しい','苦しい','泣く','孤独'],
  '嬉しい':['笑う','輝く','明るい','好き','温かい'],
  '切ない':['悲しい','寂しい','恋しい','儚い','迷う'],
  '寂しい':['孤独','悲しい','切ない','一人','沈黙'],
  '苦しい':['悲しい','怒り','恐怖','迷う','叫ぶ'],
  '怒り':['叫ぶ','苦しい','憎い','震える','恐怖'],
  '恐怖':['怖い','震える','逃げる','叫ぶ','闇'],
  '孤独':['寂しい','一人','沈黙','切ない','儚い'],
  '沈黙':['孤独','静か','一人','寂しい','夜'],
  '走る':['逃げる','叫ぶ','震える','焦る','歩く'],
  '泣く':['悲しい','切ない','苦しい','寂しい','孤独'],
  '笑う':['嬉しい','明るい','好き','輝く','温かい'],
  '叫ぶ':['怒り','恐怖','苦しい','震える','走る'],
};

function getRelatedWords(word) {
  return RELATED_MAP[word] || Object.keys(RELATED_MAP).filter(w=>w!==word).slice(0,5);
}

function escQ(s) { return s.replace(/'/g, "\\'"); }

// ---- AI単語検索（2段階表示） ----
async function aiWord(word) {
  console.log("aiWord開始: " + word); // 1. ここが出るか確認
  const gk   = genre !== 'all' ? genre : 'all';
  const gn   = GENRE[gk] || '全ジャンル';
  const inst = gk !== 'all' ? `ジャンルは${gn}固定。` : '';
  const sits = gk !== 'all' ? GLABEL[gk].slice(0,5) : ['恋愛・失恋','恋愛・成就','異世界・幕開け','ホラー・緊迫','歴史・冒頭'];
  const sitEx = sits.map((s,i) => `{"sit":"${s}","genre":"${gk!=='all'?gk:['romance','fantasy','horror','historical','general'][i]||'general'}","before":"平凡な文","after":"豊かな表現","note":"15字"}`).join(',');

  // 検索カウント追加（キャッシュ・API問わず1回として数える）
  addSearchCount();

  // ===== キャッシュチェック =====
  try {
    setLoading(true, '検索中...');
    console.log("キャッシュチェック開始");
    const cacheRes = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({word: word, genre: gk, max_tokens: 1, messages: [{role:'user',content:'ping'}]})
    });
    const cacheData = await cacheRes.json();
    console.log("キャッシュAPI結果:", cacheData);

    if (cacheData.cached && cacheData.data) {
      const cached = cacheData.data;
      
      // 類語(synonyms)または情景表現(expressions)があるか確認
      if ((cached.synonyms && cached.synonyms.length > 0) || (cached.expressions && cached.expressions.length > 0)) {
        console.log("完全なキャッシュを発見、表示します");
        setLoading(false);
        renderWord(word, cached);
        renderMemoryBar();
        const ad = document.getElementById('adSlot1'); if (ad) ad.style.display = 'block';
        return;
      } else {
        console.log("キャッシュはありましたが、内容が不完全なため再検索します");
        // ここでreturnせず、下の新規検索処理へ流す
      }
    } 
   } catch(e) {
    console.log("キャッシュチェックでエラー:", e);
  }
  console.log("キャッシュなし、新規検索へ"); // 6. ここが出るか確認

  // ===== 第1フェーズ：BA例文を先に表示 =====
  const prompt1 = `小説作家向け。「${word}」のビフォーアフター例文5件。${inst}JSONのみ:{"beforeafter":[${sitEx}]}`;

  try {
    setLoading(true, 'AIが例文を生成中...');
    const r1 = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({max_tokens: 1200, messages: [{role:'user',content:prompt1}]})
    });
    if (!r1.ok) throw new Error('APIエラー');
    const j1 = await r1.json();
    const raw1 = (j1.content||[]).map(x => x.text||'').join('');
    const phase1 = JSON.parse(repairJSON(raw1.replace(/```json/g,'').replace(/```/g,'').trim()));

    // BA例文を先に表示
    setLoading(false);
    renderPhase1(word, phase1);

    // ===== 第2フェーズ：ニュアンスカード＋情景表現を追加 =====
    const prompt2 = `小説作家向け。「${word}」の言い換え5語と情景表現7個。${inst}JSONのみ:{"synonyms":[{"word":"語","kana":"読み","nuance":"15字","tone":"poetic","genres":["${gk!=='all'?gk:'romance'}"],"intensity":70,"lyricism":60,"usecases":["シーン"],"desc":"20字","scene":"25字"},{"word":"語2","kana":"読み","nuance":"15字","tone":"modern","genres":["${gk!=='all'?gk:'general'}"],"intensity":50,"lyricism":50,"usecases":["シーン"],"desc":"20字","scene":"25字"},{"word":"語3","kana":"読み","nuance":"15字","tone":"classical","genres":["${gk!=='all'?gk:'fantasy'}"],"intensity":80,"lyricism":70,"usecases":["シーン"],"desc":"20字","scene":"25字"},{"word":"語4","kana":"読み","nuance":"15字","tone":"sensory","genres":["${gk!=='all'?gk:'horror'}"],"intensity":85,"lyricism":45,"usecases":["シーン"],"desc":"20字","scene":"25字"},{"word":"語5","kana":"読み","nuance":"15字","tone":"modern","genres":["${gk!=='all'?gk:'historical'}"],"intensity":60,"lyricism":80,"usecases":["シーン"],"desc":"20字","scene":"25字"}],"expressions":["表現1","表現2","表現3","表現4","表現5","表現6","表現7"]}`;

    // ローディング表示を追加しながら第2フェーズ
    const loadingEl = document.createElement('div');
    loadingEl.id = 'phase2Loading';
    loadingEl.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--ink3);font-size:12px;letter-spacing:.08em"><span class="dot"></span><span class="dot"></span><span class="dot"></span><div style="margin-top:.4rem">類語・情景表現を生成中...</div></div>';
    document.getElementById('area').appendChild(loadingEl);

    const r2 = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({max_tokens: 1800, word: word, genre: gk, messages: [{role:'user',content:prompt2}]})
    });
    const j2 = await r2.json();
    const raw2 = (j2.content||[]).map(x => x.text||'').join('');
    const phase2 = JSON.parse(repairJSON(raw2.replace(/```json/g,'').replace(/```/g,'').trim()));

    // ローディングを消して第2フェーズを追加
    const p2el = document.getElementById('phase2Loading');
    if (p2el) p2el.remove();
    renderPhase2(word, phase1, phase2);

    // 保存・履歴・広告
    // aiWord関数の最後の方
    console.log("第2フェーズ完了、保存を開始します"); // ここを追加
    const fullData = { ...phase2, beforeafter: phase1.beforeafter || [] };
    console.log("保存するデータの中身:", fullData); // これが以前追加したもの
    await saveMemory(word, fullData);
    console.log("保存処理が終了しました"); // ここを追加
    renderMemoryBar();
    const ad = document.getElementById('adSlot1'); if (ad) ad.style.display = 'block';

  } catch(e) {
    setLoading(false);
    document.getElementById('area').innerHTML = `<p style="text-align:center;padding:2rem;color:var(--ink3);font-size:13px">エラー: ${e.message}</p>`;
  }
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

// ---- フェーズ2：ニュアンス比較カード＋情景表現の表示 ----
function renderPhase2(word, phase1, phase2) {
  console.log("renderPhase2が呼び出されました。データ:", phase2);

  // 1. データの取得
  const syns = (phase2.synonyms || []);
  const exprs = (phase2.expressions || []);
  
  allSyns = syns;

  let h = '';

  // 2. HTML構築
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

  // 3. 表示処理
  const p2 = document.getElementById('phase2Area');
  if (p2) {
    p2.innerHTML = h;
  } else {
    const area = document.getElementById('area');
    if (area) area.innerHTML += h;
  }

  // 4. 追加処理
  if (typeof renderUGCSection === 'function') {
    const ugcEl = document.getElementById('ugcContainer');
    if (ugcEl) renderUGCSection(word, genre, ugcEl);
  }
} // ← ここがrenderPhase2の閉じ括弧

 

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
    // phase2Areaがない場合はareaに追記
    const area = document.getElementById('area');
    if (area) area.innerHTML += h;
  }
  if (typeof renderUGCSection === 'function') {
    const ugcEl = document.getElementById('ugcContainer');
    if (ugcEl) renderUGCSection(word, genre, ugcEl);
  }
}

// ---- 文章検索 ----
async function sentenceSearch(sentence) {
  setLoading(true, 'AIが文章を解析中');
  const dbHits = Object.keys(DB).filter(k => sentence.includes(k));
  const gk  = genre !== 'all' ? genre : 'all';
  const gn  = GENRE[gk] || '全ジャンル';
  const sits = gk !== 'all' ? GLABEL[gk].slice(0,5) : ['恋愛・失恋','恋愛・成就','異世界・幕開け','ホラー・緊迫','歴史・冒頭'];
  const inst = gk !== 'all' ? `ジャンルは${gn}固定。` : '';
  const sitEx = sits.map((s,i) => `{"sit":"${s}","genre":"${gk!=='all'?gk:['romance','fantasy'][i]||'general'}","before":"元の文","after":"言い換え文","note":"15字"}`).join(',');
  const prompt = `小説作家が「${sentence}」の言い換えを探しています。${inst}核となる語を特定し言い換え3語とBA2件を提案。JSONのみ:{"detected":"解釈15字","elements":[{"original":"元の語","synonyms":[{"word":"語","kana":"読み","nuance":"15字","tone":"modern","genres":["${gk!=='all'?gk:'general'}"],"intensity":50,"lyricism":50,"usecases":["シーン"],"desc":"20字","scene":"25字"}],"beforeafter":[${sitEx}]}]}`;

  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({max_tokens: 2500, messages: [{role:'user',content:prompt}]})
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    const raw    = (j.content||[]).map(c => c.text||'').join('');
    const clean  = raw.replace(/```json/g,'').replace(/```/g,'').trim();
    const parsed = JSON.parse(repairJSON(clean));
    renderSentence(sentence, parsed, dbHits);
  } catch(e) {
    setLoading(false);
    document.getElementById('area').innerHTML = `<p style="text-align:center;padding:2rem;color:var(--ink3);font-size:13px">解析エラー: ${e.message}</p>`;
  }
}

async function renderSentence(sentence, parsed, dbHits) {
  setLoading(false);
  allSyns = []; selCard = null;

  let h = `<div class="rh"><span class="rw" style="font-size:19px">「${sentence}」</span></div>
    <div class="ai-bar"><small>AIの解釈</small>${parsed.detected||'文章を解析しました'}</div>`;

  if (dbHits.length) {
    h += `<div class="sh">登録済み語録から一致</div>`;
    dbHits.forEach(k => {
      h += `<div class="db-match" onclick="qs('${k}')">
        <span class="dm-w">「${k}」</span>
        <span class="dm-m">言い換えを見る →</span>
      </div>`;
    });
    h += `<div style="height:1.25rem"></div>`;
  }

  (parsed.elements||[]).forEach((el, ei) => {
    const offset = allSyns.length;
    (el.synonyms||[]).forEach(s => allSyns.push(s));

    if ((el.beforeafter||[]).length) {
      h += `<div class="sh">「${el.original}」のビフォー→アフター（${el.beforeafter.length}件）</div><div class="ba-section"><div class="ba-grid">`;
      el.beforeafter.forEach(b => {
        const gc = GENREC[b.genre] || 'gn';
        h += `<div class="ba-card">
          <div class="ba-head"><span class="sit-tag tag ${gc}">${b.sit||''}</span>
            <button class="ba-copy" onclick="cpText('${escQ(b.after)}',this)">コピー</button></div>
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

    if ((el.synonyms||[]).length) {
      h += `<div class="sh">「${el.original}」のニュアンス比較</div><div class="nc-grid">`;
      (el.synonyms||[]).forEach((s, si) => {
        const idx = offset + si;
        const uc  = (s.usecases||[]).map(u => `<span class="uc">📌 ${u}</span>`).join(' ');
        const gt  = (s.genres||[]).slice(0,2).map(g => `<span class="tag ${GENREC[g]||'gn'}">${GENRE[g]||g}</span>`).join('');
        h += `<div class="nc" id="c${idx}" onclick="showDetailSent(${idx},${ei})">
          <div class="nc-w">${s.word}</div><div class="nc-k">${s.kana}</div>
          <div class="brow"><span class="blabel">強度</span><div class="bbar"><div class="bfill" style="width:${s.intensity||50}%"></div></div></div>
          <div class="brow"><span class="blabel">詩的さ</span><div class="bbar"><div class="bfill" style="width:${s.lyricism||50}%"></div></div></div>
          <div class="nc-n">${s.nuance}</div>
          <div class="tags"><span class="tag ${TONEC[s.tone]||'tm'}">${TONE[s.tone]||s.tone}</span>${gt}</div>
          ${uc ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px">${uc}</div>` : ''}
        </div>`;
      });
      h += `</div><div class="detail" id="det${ei}"></div>`;
    }
  });

  document.getElementById('area').innerHTML = h;
  window._sEls = parsed.elements || [];
}

function showDetailSent(idx, ei) {
  const s = allSyns[idx]; if (!s) return;
  if (selCard !== null) document.getElementById(`c${selCard}`)?.classList.remove('sel');
  selCard = idx;
  document.getElementById(`c${idx}`)?.classList.add('sel');
  const d = document.getElementById(`det${ei}`);
  if (d) {
    d.innerHTML = `<div class="dw">${s.word}</div><div class="dk">${s.kana}</div><div class="dd">${s.desc||''}</div><div class="ds">${s.scene||''}</div>`;
    d.classList.add('show');
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
  if (s) { sessionStorage.removeItem('autoSearch'); si.value = s; doSearch(); }
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
