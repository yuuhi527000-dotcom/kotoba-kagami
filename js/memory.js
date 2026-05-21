// ===== 記憶機能（検索履歴のlocalStorage保存） =====

// localStorageのキーのプレフィックス
const MEM_PREFIX = 'mem:';

async function saveMemory(word, data) {
  try {
    const key = MEM_PREFIX + word;
    const value = JSON.stringify({ word, data, savedAt: Date.now() });
    window.localStorage.setItem(key, value);
    renderMemoryBar();
  } catch(e) { 
    console.warn('memory save error:', e); 
  }
}

async function loadMemory(word) {
  try {
    const key = MEM_PREFIX + word;
    const r = window.localStorage.getItem(key);
    if (r) return JSON.parse(r).data;
  } catch(e) {}
  return null;
}

async function deleteMemory(word, e) {
  if (e) e.stopPropagation();
  try {
    const key = MEM_PREFIX + word;
    window.localStorage.removeItem(key);
    renderMemoryBar();
  } catch(e2) {}
}

async function renderMemoryBar() {
  const bar = document.getElementById('memoryBar');
  if (!bar) return;
  try {
    // localStorageから 'mem:' で始まるキーをすべて抽出
    const items = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(MEM_PREFIX)) {
        const val = window.localStorage.getItem(key);
        if (val) {
          try { items.push(JSON.parse(val)); } catch(e) {}
        }
      }
    }
    
    if (items.length === 0) { 
      bar.innerHTML = ''; 
      return; 
    }

    // 保存日時の新しい順にソートして最大10件にする
    items.sort((a, b) => b.savedAt - a.savedAt);
    const displayItems = items.slice(0, 10);

    bar.innerHTML = `<span class=\"mem-label\">記憶：</span>` +
      displayItems.map(item => `
        <span class="mem-chip" onclick="qs('${item.word.replace(/'/g, "\\'")}')">
          ${item.word}
          <span class="mem-del" onclick="deleteMemory('${item.word.replace(/'/g, "\\'")}', event)">×</span>
        </span>
      `).join('');
  } catch(e) {
    console.warn('memory render error:', e);
  }
}

// ページ読み込み時に一度履歴バーを描画する
document.addEventListener('DOMContentLoaded', () => {
  renderMemoryBar();
});
