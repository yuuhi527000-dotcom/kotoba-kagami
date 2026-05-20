// ===== 定数 =====
const TONE  = {poetic:'詩的',classical:'古語',modern:'現代語',sensory:'感覚的'};
const TONEC = {poetic:'tp',classical:'tc',modern:'tm',sensory:'ts'};
const GENRE = {romance:'恋愛',fantasy:'ファンタジー',horror:'ホラー',historical:'歴史',general:'汎用'};
const GENREC= {romance:'gr',fantasy:'gf',horror:'gh',historical:'ghi',general:'gn'};
const GLABEL= {
  romance:  ['恋愛・失恋','恋愛・成就','恋愛・片思い','恋愛・告白','恋愛・すれ違い'],
  fantasy:  ['異世界・幕開け','異世界・幕締め','異世界・戦闘','異世界・仲間の死','異世界・冒頭情景'],
  horror:   ['ホラー・緊迫','ホラー・恐怖の絶頂','ホラー・不穏な日常','ホラー・逃走'],
  historical:['歴史・冒頭の情景','歴史・合戦','歴史・別れ','歴史・日常'],
  general:  ['汎用・クライマックス','汎用・冒頭','汎用・回想','汎用・心情描写'],
};

// パスワードハッシュ（管理者用）
// 変更する場合: SHA-256ハッシュ値を差し替えてください
const ADMIN_HASH = '42c0be66d68c8198d859cffeebafbfeb8f1fe6e4447c245b055cb4036583b5a6';
