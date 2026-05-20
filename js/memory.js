// ===== 記憶機能（検索履歴のStorage保存） =====

async function saveMemory(word, data) {
  try {
    await window.storage.set(`mem:${word}`, JSON.stringify({word, data, savedAt: Date.now()}));
    renderMemoryBar();
  } catch(e) { console.warn('memory save error:', e); }
}

async function loadMemory(word) {
  try {
    const r = await window.storage.get(`mem:${word}`);
    if (r && r.value) return JSON.parse(r.value).data;
  } catch(e) {}
  return null;
}

async function deleteMemory(word, e) {
  e.stopPropagation();
  try {
    await window.storage.delete(`mem:${word}`);
    renderMemoryBar();
  } catch(e2) {}
}

async function renderMemoryBar() {
  const bar = document.getElementById('memoryBar');
  if (!bar) return;
  try {
    const result = await window.storage.list('mem:');
    const keys = (result && result.keys) ? result.keys : [];
    if (keys.length === 0) { bar.innerHTML = ''; return; }

    const items = [];
    for (const k of keys.slice(-10)) {
      try {
        const r = await window.storage.get(k);
        if (r) items.push(JSON.parse(r.value));
      } catch(e) {}
    }
    items.sort((a,b) => b.savedAt - a.savedAt);

    bar.innerHTML = `<span class="mem-label">記憶：</span>` +
      items.map(item => `
        <span class="mem-chip" onclick="qs('${item.word.replace(/'/g,"\\'")}')">
          ${item.word}
          <span class="mem-del" onclick="deleteMemory('${item.word.replace(/'/g,"\\'")}',event)" title="削除">✕</span>
        </span>`).join('');
  } catch(e) { bar.innerHTML = ''; }
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
