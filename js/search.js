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
  if (/[がをにはでもとへのやをも]/.test(t)) return true;
  if (/する|した|してい|れる|られる|てい|ない|ます|です|だった|いた|って|った|んだ|いで|んで|めた|けた/.test(t)) return true;
  return false;
}

async function doSearch() {
  const consent = document.getElementById('aiConsent');
  if (consent && !consent.checked) {
    document.getElementById('empty').style.display = 'none';
    document.getElementById('area').innerHTML = '<div style="text-align:center;padding:2.5rem 1rem;color:var(--ink3)"><div style="font-size:32px;margin-bottom:.75rem;opacity:.3">🤖</div><div style="font-size:14px;color:var(--ink2);margin-bottom:.5rem">AI使用に同意が必要です</div><div style="font-size:13px;line-height:1.8">上の「AI使用に同意」にチェックを入れると言い換え表現を検索できます</div></div>';
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
    await aiWord(input);
  }
}

function setLoading(on, msg) {
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
  const gb = genre !== 'all' ? '<span class="rbadge">' + (GENRE[genre]||genre) + '向けを優先</span>' : '';
  let h = '<div class="rh"><span class="rw">「' + word + '」</span><span class="rm">の言い換え ' + syns.length + '件</span>' + gb + '</div>';
  if (bas.length) {
    h += '<div class="sh">ビフォー → アフター 例文集（' + bas.length + '件）</div><div class="ba-section"><div class="ba-grid">';
    bas.forEach(function(b) {
      const gc = GENREC[b.genre] || 'gn';
      h += '<div class="ba-card"><div class="ba-head"><span class="sit-tag tag ' + gc + '">' + (b.sit||'') + '</span><button class="ba-copy" onclick="cpText(\'' + escQ(b.after) + '\',this)">コピー</button></div><div class="ba-body"><div class="ba-b">' + b.before + '</div><div class="ba-arrow">→</div><div class="ba-a">' + b.after + '</div></div>' + (b.note ? '<div class="ba-note">' + b.note + '</div>' : '') + '</div>';
    });
    h += '</div></div>';
  }
  if ((data.expressions||[]).length) {
    h += '<div class="sh">情景表現フレーズ</div><div class="expr-list">';
    data.expressions.forEach(function(e) { h += '<div class="expr">' + e + '</div>'; });
    h += '</div>';
  }
  if (syns.length) {
    h += '<div class="sh">ニュアンス比較カード</div><div class="nc-grid">';
    syns.forEach(function(s, i) {
      const gt = (s.genres||[]).slice(0,2).map(function(g) { return '<span class="tag ' + (GENREC[g]||'gn') + '">' + (GENRE[g]||g) + '</span>'; }).join('');
      h += '<div class="nc" id="c' + i + '" onclick="showDetail(' + i + ')"><div class="nc-w">' + s.word + '</div><div class="nc-k">' + s.kana + '</div><div class="brow"><span class="blabel">強度</span><div class="bbar"><div class="bfill" style="width:' + (s.intensity||50) + '%"></div></div></div><div class="brow"><span class="blabel">詩的さ</span><div class="bbar"><div class="bfill" style="width:' + (s.lyricism||50) + '%"></div></div></div><div class="nc-n">' + s.nuance + '</div><div class="tags"><span class="tag ' + (TONEC[s.tone]||'tm') + '">' + (TONE[s.tone]||s.tone) + '</span>' + gt + '</div></div>';
    });
    h += '</div><div class="detail" id="detail"><div class="dw" id="dw"></div><div class="dk" id="dk"></div><div class="dd" id="dd"></div><div class="ds" id="ds"></div><div class="dacts"><button class="cbtn" id="cb1" onclick="cp(\'dw\',\'cb1\')">単語をコピー</button><button class="cbtn" id="cb2" onclick="cp(\'ds\',\'cb2\')">例文をコピー</button></div></div>';
  }
  document.getElementById('area').innerHTML = h;
  if (typeof renderUGCSection === 'function') await renderUGCSection(word, genre, null);
}

function showDetail(i) {
  const s = allSyns[i]; if (!s) return;
  if (selCard !== null) { const prev = document.getElementById('c' + selCard); if (prev) prev.classList.remove('sel'); }
  selCard = i;
  const cur = document.getElementById('c' + i); if (cur) cur.classList.add('sel');
  document.getElementById('dw').textContent = s.word;
  document.getElementById('dk').textContent = s.kana;
  document.getElementById('dd').textContent = s.desc || '';
  document.getElementById('ds').textContent = s.scene || '';
  document.getElementById('detail').classList.add('show');
}

function cp(id, bid) {
  navigator.clipboard.writeText(document.getElementById(id).textContent).then(function() {
    const b = document.getElementById(bid);
    b.textContent = '✓ コピー済み';
    b.style.background = 'var(--acc)';
    b.style.color = '#fff';
    setTimeout(function() {
      b.textContent = id === 'dw' ? '単語をコピー' : '例文をコピー';
      b.style.background = '';
      b.style.color = '';
    }, 1800);
  });
}

function cpText(text, btn) {
  navigator.clipboard.writeText(text).then(function() {
    btn.textContent = '✓ コピー済み';
    btn.style.background = 'var(--acc)';
    btn.style.color = '#fff';
    setTimeout(function() {
      btn.textContent = 'コピー';
      btn.style.background = '';
      btn.style.color = '';
    }, 1800);
  });
}

function escQ(s) { return String(s).replace(/'/g, "\\'"); }

function repairJSON(str) {
  if (typeof str !== 'string') return '{}';
  str = str.replace(/```json/g, '').replace(/```/g, '').trim();
  const st = []; let inS = false, esc = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inS) { esc = true; continue; }
    if (c === '"') { inS = !inS; continue; }
    if (inS) continue;
    if (c === '{') st.push('}');
    else if (c === '[') st.push(']');
    else if (c === '}' || c === ']') st.pop();
  }
  let r = str;
  if (inS) r += '"';
  while (st.length) r += st.pop();
  return r;
}

async function aiWord(word) {
  const gk = genre !== 'all' ? genre : 'all';
  const gn = GENRE[gk] || '全ジャンル';
  const sits = gk !== 'all' ? GLABEL[gk].slice(0, 2) : ['恋愛・失恋', '異世界・幕開け'];
  const inst = gk !== 'all' ? 'ジャンルは' + gn + '固定。' : '';
  const sitEx = sits.map(function(s, i) {
    return '{"sit":"' + s + '","genre":"' + (gk !== 'all' ? gk : ['romance','fantasy'][i]||'general') + '","before":"平凡な文","after":"豊かな表現","note":"15字"}';
  }).join(',');
  const prompt = '小説作家向け。「' + word + '」の言い換え3語。' + inst + 'JSONのみ:{"synonyms":[{"word":"語","kana":"読み","nuance":"15字","tone":"poetic","genres":["' + (gk !== 'all' ? gk : 'romance') + '"],"intensity":70,"lyricism":60,"usecases":["シーン"],"desc":"20字","scene":"25字"},{"word":"語2","kana":"読み","nuance":"15字","tone":"modern","genres":["' + (gk !== 'all' ? gk : 'general') + '"],"intensity":50,"lyricism":50,"usecases":["シーン"],"desc":"20字","scene":"25字"},{"word":"語3","kana":"読み","nuance":"15字","tone":"classical","genres":["' + (gk !== 'all' ? gk : 'fantasy') + '"],"intensity":80,"lyricism":70,"usecases":["シーン"],"desc":"20字","scene":"25字"}],"expressions":["表現1","表現2"],"beforeafter":[' + sitEx + ']}';
  try {
    setLoading(true, 'AIが生成中');
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    });
    if (!r.ok) throw new Error('APIエラー');
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || 'APIエラー');
    const raw = (j.content || []).map(function(x) { return x.text || ''; }).join('');
    const parsed = JSON.parse(repairJSON(raw));
    if (!parsed.synonyms) throw new Error('データ不正');
    renderWord(word, parsed);
  } catch(e) {
    setLoading(false);
    document.getElementById('area').innerHTML = '<p style="text-align:center;padding:2rem;color:var(--ink3);font-size:13px">エラー: ' + e.message + '</p>';
  }
}

async function sentenceSearch(sentence) {
  setLoading(true, 'AIが文章を解析中');
  const gk = genre !== 'all' ? genre : 'all';
  const gn = GENRE[gk] || '全ジャンル';
  const sits = gk !== 'all' ? GLABEL[gk].slice(0, 2) : ['恋愛・失恋', '異世界・幕開け'];
  const inst = gk !== 'all' ? 'ジャンルは' + gn + '固定。' : '';
  const sitEx = sits.map(function(s, i) {
    return '{"sit":"' + s + '","genre":"' + (gk !== 'all' ? gk : ['romance','fantasy'][i]||'general') + '","before":"元の文","after":"言い換え文","note":"15字"}';
  }).join(',');
  const prompt = '小説作家が「' + sentence + '」の言い換えを探しています。' + inst + '核となる語を特定し言い換え3語とBA2件を提案。JSONのみ:{"detected":"解釈15字","elements":[{"original":"元の語","synonyms":[{"word":"語","kana":"読み","nuance":"15字","tone":"modern","genres":["' + (gk !== 'all' ? gk : 'general') + '"],"intensity":50,"lyricism":50,"usecases":["シーン"],"desc":"20字","scene":"25字"}],"beforeafter":[' + sitEx + ']}]}';
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    const raw = (j.content || []).map(function(c) { return c.text || ''; }).join('');
    const parsed = JSON.parse(repairJSON(raw));
    renderSentence(sentence, parsed);
  } catch(e) {
    setLoading(false);
    document.getElementById('area').innerHTML = '<p style="text-align:center;padding:2rem;color:var(--ink3);font-size:13px">解析エラー: ' + e.message + '</p>';
  }
}

async function renderSentence(sentence, parsed) {
  setLoading(false);
  allSyns = []; selCard = null;
  let h = '<div class="rh"><span class="rw" style="font-size:19px">「' + sentence + '」</span></div><div class="ai-bar"><small>AIの解釈</small>' + (parsed.detected || '文章を解析しました') + '</div>';
  (parsed.elements || []).forEach(function(el, ei) {
    const offset = allSyns.length;
    (el.synonyms || []).forEach(function(s) { allSyns.push(s); });
    if ((el.beforeafter || []).length) {
      h += '<div class="sh">「' + el.original + '」のビフォー→アフター</div><div class="ba-section"><div class="ba-grid">';
      el.beforeafter.forEach(function(b) {
        const gc = GENREC[b.genre] || 'gn';
        h += '<div class="ba-card"><div class="ba-head"><span class="sit-tag tag ' + gc + '">' + (b.sit||'') + '</span><button class="ba-copy" onclick="cpText(\'' + escQ(b.after) + '\',this)">コピー</button></div><div class="ba-body"><div class="ba-b">' + b.before + '</div><div class="ba-arrow">→</div><div class="ba-a">' + b.after + '</div></div>' + (b.note ? '<div class="ba-note">' + b.note + '</div>' : '') + '</div>';
      });
      h += '</div></div>';
    }
  });
  document.getElementById('area').innerHTML = h;
}

document.addEventListener('DOMContentLoaded', function() {
  const si = document.getElementById('si');
  if (si) si.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSearch(); });
});
