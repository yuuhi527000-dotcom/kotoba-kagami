// ===== 記憶機能（検索履歴のlocalStorage保存） =====

const MEM_PREFIX = 'mem:';

async function saveMemory(word, data) {
  try {
    if (!word) return;
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

    items.sort((a, b) => b.savedAt - a.savedAt);
    const displayItems = items.slice(0, 10);

    bar.innerHTML = `<span class="gl" style="font-size:12px;color:var(--ink3);margin-right:8px;">記憶：</span>` +
      displayItems.map(item => `
        <span class="gbtn" style="padding:2px 8px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;margin-right:4px;margin-bottom:4px;" onclick="qs('${item.word.replace(/'/g, "\\'")}')">
          ${item.word}
          <span style="opacity:0.5;padding-left:2px" onclick="deleteMemory('${item.word.replace(/'/g, "\\'")}', event)">×</span>
        </span>
      `).join('');
  } catch(e) {
    console.warn('memory render error:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderMemoryBar();
});
