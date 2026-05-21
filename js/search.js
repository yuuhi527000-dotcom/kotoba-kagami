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
      <div style="text-align:center;padding:2.5rem 1rem;color:var(--ink3)">
        <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">🤖</div>
        <div style="font-size:14px;color:var(--ink2);margin-bottom:.5rem">AI使用に同意が必要です</div>
        <div style="font-size:13px;line-height:1.8">上の「AI使用に同意」にチェックを入れると<br>言い換え表現を検索できます</div>
      </div>`;
    return;
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
    // AIで生成
setLoading(true, 'AIが表現を生成中');
await aiWord(input);
  }
}

function setLoading(on, msg = '') {
  const el = document.getElementById('loading');
  el.classList.toggle('show', on);
  if (msg) document.getElementById('lmsg').textContent = msg;
}

// ---- 単語レンダリング ----
async function renderWord(word, data) {
  setLoading(false);
  allSyns  = [];
  selCard  = null;

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

  // ③ ビフォーアフター（メイン）
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

  // 情景表現
  if ((data.expressions||[]).length) {
    h += `<div class="sh">情景表現フレーズ</div><div class="expr-list">`;
    data.expressions.forEach(e => { h += `<div class="expr">${e}</div>`; });
    h += `</div>`;
  }

  // ① ニュアンスカード
  if (syns.length) {
    h += `<div class="sh">ニュアンス比較カード（クリックで詳細）</div><div class="nc-grid">`;
    syns.forEach((s, i) => {
      const uc  = (s.usecases||[]).map(u => `<span class="uc">📌 ${u}</span>`).join(' ');
      const gt  = (s.genres||[]).slice(0,2).map(g => `<span class="tag ${GENREC[g]||'gn'}">${GENRE[g]||g}</span>`).join('');
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

  // UGCセクション
  const ugcContainer = document.createElement('div');
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

// ---- 詳細パネル ----
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

// ---- AI単語検索 ----
async function aiWord(word) {
  // AI使用同意チェック
  const consent = document.getElementById('aiConsent');
  if (consent && !consent.checked) {
    setLoading(false);
    document.getElementById('area').innerHTML = `
      <div style="text-align:center;padding:2.5rem 1rem;color:var(--ink3)">
        <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">🤖</div>
        <div style="font-size:14px;color:var(--ink2);margin-bottom:.5rem">「${word}」はDB未収録です</div>
        <div style="font-size:13px;line-height:1.8">AI生成を使用するには<br>「AI使用に同意」にチェックを入れてください</div>
      </div>`;
    return;
  }
  const gk   = genre !== 'all' ? genre : 'all';
  const gn   = GENRE[gk] || '全ジャンル';
  const sits = gk !== 'all' ? GLABEL[gk] : ['恋愛・失恋','恋愛・成就','異世界・幕開け','異世界・幕締め','ホラー・緊迫','歴史・冒頭','汎用・クライマックス'];
  const inst = gk !== 'all' ? `【重要】ジャンルは「${gn}」に完全固定。beforeafterのgenreはすべて"${gk}"のみ。` : '複数ジャンルで出すこと。';
  const sitEx = sits.map((s,i) => `{"sit":"${s}","genre":"${gk!=='all'?gk:['romance','romance','fantasy','fantasy','horror','historical','general'][i]||'general'}","before":"平凡な文${i+1}","after":"豊かな表現${i+1}","note":"20字"}`).join(',');

  const prompt = `小説・ラノベ作家向け。「${word}」の言い換え。${inst}
JSONのみ（マークダウン不要）:
{"synonyms":[{"word":"語","kana":"読み","nuance":"20字","tone":"poetic","genres":["${gk!=='all'?gk:'romance'}"],"intensity":70,"lyricism":60,"usecases":["シーン1","シーン2"],"desc":"40字","scene":"40字"}],"expressions":["表現1","表現2","表現3","表現4"],"beforeafter":[${sitEx}]}`;

  try {
    setLoading(true, 'AIが生成中');
    const r = await fetch('/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({max_tokens:2000, stream:false, messages:[{role:'user',content:prompt}]})
    });

    if (!r.ok) throw new Error('APIエラー');

    // ストリーミング受信
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let raw = '';
    let rendered = false;

    setLoading(false);
    // ローディング表示をプレースホルダーに切り替え
    document.getElementById('area').innerHTML = `
      <div style="padding:1.5rem 0">
        <div style="height:24px;background:var(--paper2);border-radius:2px;margin-bottom:8px;animation:p 1.2s ease-in-out infinite"></div>
        <div style="height:80px;background:var(--paper2);border-radius:2px;margin-bottom:8px;animation:p 1.2s ease-in-out infinite;animation-delay:.1s"></div>
        <div style="height:80px;background:var(--paper2);border-radius:2px;animation:p 1.2s ease-in-out infinite;animation-delay:.2s"></div>
      </div>`;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      // SSEからテキストデルタを抽出
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              raw += data.delta.text;
            }
          } catch(e) {}
        }
      }

      // JSONが揃ったら途中でもレンダリング試行
      if (!rendered && raw.includes('"beforeafter"') && raw.includes(']')) {
        try {
          const parsed = JSON.parse(repairJSON(raw.replace(/```json|```/g,'').trim()));
          if (parsed.synonyms?.length) {
            renderWord(word, parsed);
            rendered = true;
          }
        } catch(e) {}
      }
    }

    // 最終レンダリング
    if (raw) {
      try {
        const parsed = JSON.parse(repairJSON(raw.replace(/```json|```/g,'').trim()));
        renderWord(word, parsed);
        await saveMemory(word, parsed);
      } catch(e) {
        if (!rendered) throw new Error('解析エラー');
      }
    }
  } catch(e) {
    setLoading(false);
    document.getElementById('area').innerHTML = `<p style="text-align:center;padding:2rem;color:var(--ink3);font-size:13px">エラー: ${e.message}</p>`;
  }
}

// ---- 文章検索 ----
async function sentenceSearch(sentence) {
  setLoading(true, 'AIが文章を解析中');
  const dbHits = Object.keys(DB).filter(k => sentence.includes(k));
  const gk  = genre !== 'all' ? genre : 'all';
  const gn  = GENRE[gk] || '全ジャンル';
  const sits = gk !== 'all' ? GLABEL[gk].slice(0,5) : ['恋愛・失恋','恋愛・成就','異世界・幕開け','ホラー・緊迫','歴史・冒頭'];
  const inst = gk !== 'all' ? `【重要】ジャンルは「${gn}」に完全固定。beforeafterのgenreはすべて"${gk}"のみ。` : '';
  const sitEx = sits.map((s,i) => `{"sit":"${s}","genre":"${gk!=='all'?gk:['romance','romance','fantasy','horror','historical'][i]||'general'}","before":"元の文","after":"言い換え文","note":"15字"}`).join(',');

  const prompt = `小説作家が「${sentence}」の言い換えを探しています。${inst}
この文の核となる動詞・形容詞を最大2つ特定し、各々に言い換え3語とビフォーアフター5件を提案。
JSONのみ:
{"detected":"解釈15字","elements":[{"original":"元の語","synonyms":[{"word":"語","kana":"読み","nuance":"15字","tone":"modern","genres":["${gk!=='all'?gk:'general'}"],"intensity":50,"lyricism":50,"usecases":["シーン"],"desc":"30字","scene":"35字"}],"beforeafter":[${sitEx}]}]}`;

  try {
    const r = await fetch('/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({max_tokens:3000, messages:[{role:'user',content:prompt}]})
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    const raw    = j.content.map(c => c.text||'').join('');
    const parsed = JSON.parse(repairJSON(raw.replace(/```json|```/g,'').trim()));
    renderSentence(sentence, parsed, dbHits);
  } catch(e) {
    setLoading(false);
    document.getElementById('area').innerHTML = `<p style="text-align:center;padding:2rem;color:var(--ink3);font-size:13px">解析エラー: ${e.message}</p>`;
  }
}

// ---- 文章レンダリング ----
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
        <span class="dm-m">${DB[k].synonyms.length}件の言い換え＋${DB[k].beforeafter.length}件の例文 →</span>
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

// ---- JSON修復 ----
function repairJSON(str) {
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
