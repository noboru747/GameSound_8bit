// 參數說明與預設音效。純資料，瀏覽器介面與 Node 命令列共用（不 import 任何東西）。

export const WAVE_TYPES = ['方波', '鋸齒波', '正弦波', '雜訊'];

// [參數名, 中文, 是否有正負]
export const PARAM_GROUPS = [
  ['音量包絡', [
    ['p_env_attack', '起音', false],
    ['p_env_sustain', '持續', false],
    ['p_env_punch', '衝擊', false],
    ['p_env_decay', '衰減', false],
  ]],
  ['音高', [
    ['p_base_freq', '起始音高', false],
    ['p_freq_limit', '最低音高', false],
    ['p_freq_ramp', '音高滑動', true],
    ['p_freq_dramp', '滑動加速', true],
  ]],
  ['顫音 / 跳音', [
    ['p_vib_strength', '顫音深度', false],
    ['p_vib_speed', '顫音速度', false],
    ['p_arp_mod', '跳音幅度', true],
    ['p_arp_speed', '跳音速度', false],
  ]],
  ['方波 / 重複', [
    ['p_duty', '佔空比', false],
    ['p_duty_ramp', '佔空比變化', true],
    ['p_repeat_speed', '重複速度', false],
  ]],
  ['鑲邊', [
    ['p_pha_offset', '鑲邊偏移', true],
    ['p_pha_ramp', '鑲邊變化', true],
  ]],
  ['濾波', [
    ['p_lpf_freq', '低通截止', false],
    ['p_lpf_ramp', '低通變化', true],
    ['p_lpf_resonance', '低通共振', false],
    ['p_hpf_freq', '高通截止', false],
    ['p_hpf_ramp', '高通變化', true],
  ]],
  ['輸出', [
    ['sound_vol', '產生音量', false],
  ]],
];

// jsfxr 內建的隨機產生器
export const GENERATORS = [
  ['pickupCoin', '拾取'],
  ['laserShoot', '雷射'],
  ['explosion', '爆炸'],
  ['powerUp', '強化'],
  ['hitHurt', '受擊'],
  ['jump', '跳躍'],
  ['blipSelect', '選取'],
  ['synth', '合成'],
  ['tone', '單音'],
  ['random', '完全隨機'],
];

export const CATEGORIES = {
  skill: '招式施放',
  impact: '命中 / 爆炸',
  hit: '受擊',
  status: '狀態效果',
  item: '道具',
  unit: '單位',
  ui: '介面',
};

// 所有音效共用的輸出設定（16-bit 比預設的 8-bit 乾淨）
export const BASE = { sound_vol: 0.25, sample_rate: 44100, sample_size: 16 };

// 預設音效包：固定參數（不是隨機），重新產生結果一樣。id 就是遊戲端引用的音效 id
const W = { SQUARE: 0, SAW: 1, SINE: 2, NOISE: 3 };
export const STARTER_PACK = [
  // 招式施放（依形狀）
  { id: 'cast-line', label: '直線施放（噴射）', category: 'skill', volume: 0.5,
    params: { wave_type: W.NOISE, p_env_attack: 0.05, p_env_sustain: 0.35, p_env_decay: 0.3, p_env_punch: 0.1, p_base_freq: 0.35, p_freq_ramp: -0.05, p_lpf_freq: 0.55, p_lpf_ramp: -0.1, p_hpf_freq: 0.05 } },
  { id: 'cast-orbs', label: '投射物施放（鬼火）', category: 'skill', volume: 0.45,
    params: { wave_type: W.SINE, p_env_attack: 0.1, p_env_sustain: 0.2, p_env_decay: 0.35, p_base_freq: 0.45, p_freq_ramp: 0.15, p_vib_strength: 0.4, p_vib_speed: 0.5, p_pha_offset: 0.2, p_pha_ramp: -0.1 } },
  { id: 'cast-dash', label: '突進', category: 'skill', volume: 0.5,
    params: { wave_type: W.NOISE, p_env_sustain: 0.08, p_env_decay: 0.2, p_base_freq: 0.6, p_freq_ramp: -0.35, p_hpf_freq: 0.25, p_lpf_freq: 0.8 } },
  { id: 'cast-blast', label: '蓄力（範圍爆炸施放）', category: 'skill', volume: 0.45,
    params: { wave_type: W.SAW, p_env_attack: 0.25, p_env_sustain: 0.2, p_env_decay: 0.15, p_base_freq: 0.2, p_freq_ramp: 0.25, p_vib_strength: 0.2, p_vib_speed: 0.6, p_lpf_freq: 0.7 } },
  { id: 'cast-buff', label: '自身強化', category: 'skill', volume: 0.4,
    params: { wave_type: W.SQUARE, p_env_sustain: 0.2, p_env_decay: 0.3, p_base_freq: 0.3, p_freq_ramp: 0.3, p_duty: 0.4, p_arp_mod: 0.3, p_arp_speed: 0.6 } },
  // 命中 / 爆炸
  { id: 'impact-blast', label: '大爆炸', category: 'impact', volume: 0.6,
    params: { sound_vol: 0.16, wave_type: W.NOISE, p_env_sustain: 0.35, p_env_decay: 0.55, p_env_punch: 0.6, p_base_freq: 0.1, p_freq_ramp: -0.05, p_pha_offset: 0.2, p_pha_ramp: -0.1, p_lpf_freq: 0.75 } },
  { id: 'impact-orbs', label: '投射物落地', category: 'impact', volume: 0.45,
    params: { wave_type: W.NOISE, p_env_sustain: 0.1, p_env_decay: 0.3, p_env_punch: 0.3, p_base_freq: 0.45, p_freq_ramp: -0.2, p_lpf_freq: 0.5 } },
  // 受擊
  { id: 'hit', label: '一般受擊', category: 'hit', volume: 0.45,
    params: { wave_type: W.NOISE, p_env_sustain: 0.03, p_env_decay: 0.15, p_env_punch: 0.4, p_base_freq: 0.5, p_freq_ramp: -0.4, p_hpf_freq: 0.1 } },
  { id: 'hit-super', label: '效果絕佳', category: 'hit', volume: 0.55,
    params: { sound_vol: 0.2, wave_type: W.SAW, p_env_sustain: 0.05, p_env_decay: 0.25, p_env_punch: 0.6, p_base_freq: 0.35, p_freq_ramp: -0.45 } },
  { id: 'hit-weak', label: '效果不好', category: 'hit', volume: 0.3,
    params: { wave_type: W.NOISE, p_env_sustain: 0.02, p_env_decay: 0.08, p_env_punch: 0.1, p_base_freq: 0.7, p_freq_ramp: -0.3, p_lpf_freq: 0.5 } },
  // 狀態效果
  { id: 'status-burn', label: '灼傷', category: 'status', volume: 0.4,
    params: { wave_type: W.NOISE, p_env_sustain: 0.15, p_env_decay: 0.25, p_base_freq: 0.3, p_repeat_speed: 0.55, p_lpf_freq: 0.7 } },
  { id: 'status-poison', label: '中毒', category: 'status', volume: 0.4,
    params: { wave_type: W.SINE, p_env_sustain: 0.2, p_env_decay: 0.25, p_base_freq: 0.3, p_freq_ramp: -0.1, p_vib_strength: 0.6, p_vib_speed: 0.7 } },
  { id: 'status-paralysis', label: '麻痺', category: 'status', volume: 0.4,
    params: { wave_type: W.SQUARE, p_env_sustain: 0.15, p_env_decay: 0.2, p_base_freq: 0.6, p_freq_ramp: -0.2, p_duty: 0.2, p_duty_ramp: 0.3, p_repeat_speed: 0.6, p_arp_mod: 0.5, p_arp_speed: 0.8 } },
  { id: 'status-sleep', label: '睡眠', category: 'status', volume: 0.4,
    params: { wave_type: W.SINE, p_env_attack: 0.1, p_env_sustain: 0.2, p_env_decay: 0.45, p_base_freq: 0.35, p_freq_ramp: -0.12, p_vib_strength: 0.2, p_vib_speed: 0.2 } },
  { id: 'status-freeze', label: '冰凍', category: 'status', volume: 0.4,
    params: { wave_type: W.SQUARE, p_env_sustain: 0.1, p_env_decay: 0.4, p_base_freq: 0.8, p_freq_ramp: -0.05, p_duty: 0.1, p_arp_mod: 0.4, p_arp_speed: 0.6, p_hpf_freq: 0.2 } },
  { id: 'status-haste', label: '加速', category: 'status', volume: 0.4,
    params: { wave_type: W.SAW, p_env_sustain: 0.1, p_env_decay: 0.25, p_base_freq: 0.3, p_freq_ramp: 0.35, p_hpf_freq: 0.1 } },
  // 道具
  { id: 'item-heal', label: '補血', category: 'item', volume: 0.45,
    params: { wave_type: W.SINE, p_env_sustain: 0.25, p_env_decay: 0.4, p_base_freq: 0.4, p_freq_ramp: 0.2, p_arp_mod: 0.3, p_arp_speed: 0.5, p_vib_strength: 0.1, p_vib_speed: 0.4 } },
  { id: 'item-eject', label: '彈出', category: 'item', volume: 0.45,
    params: { wave_type: W.SQUARE, p_env_sustain: 0.1, p_env_decay: 0.2, p_base_freq: 0.35, p_freq_ramp: 0.3, p_duty: 0.4 } },
  // 撿取
  { id: 'loot-gold', label: '撿到金幣', category: 'item', volume: 0.35,
    params: { wave_type: W.SQUARE, p_env_sustain: 0.04, p_env_decay: 0.22, p_env_punch: 0.45, p_base_freq: 0.55, p_duty: 0.5, p_arp_mod: 0.45, p_arp_speed: 0.62 } },
  { id: 'loot-item', label: '撿到道具', category: 'item', volume: 0.4,
    params: { wave_type: W.SINE, p_env_sustain: 0.08, p_env_decay: 0.3, p_env_punch: 0.2, p_base_freq: 0.42, p_freq_ramp: 0.18, p_arp_mod: 0.25, p_arp_speed: 0.5 } },
  // 單位
  { id: 'unit-faint', label: '倒下', category: 'unit', volume: 0.45,
    params: { wave_type: W.SQUARE, p_env_sustain: 0.3, p_env_decay: 0.4, p_base_freq: 0.5, p_freq_ramp: -0.25, p_freq_dramp: -0.05, p_duty: 0.5, p_vib_strength: 0.1, p_vib_speed: 0.3 } },
  { id: 'unit-respawn', label: '重生', category: 'unit', volume: 0.35,
    params: { wave_type: W.SINE, p_env_attack: 0.05, p_env_sustain: 0.15, p_env_decay: 0.3, p_base_freq: 0.35, p_freq_ramp: 0.25, p_arp_mod: 0.4, p_arp_speed: 0.55 } },
  // 介面
  { id: 'ui-denied', label: '無法使用 / 冷卻中', category: 'ui', volume: 0.3,
    params: { wave_type: W.SQUARE, p_env_sustain: 0.05, p_env_decay: 0.1, p_base_freq: 0.2, p_duty: 0.5, p_lpf_freq: 0.6 } },
];

// 套用輸出設定 + 覆寫參數，回傳 jsfxr Params
export function makeParams(jsfxr, overrides = {}) {
  const p = new jsfxr.Params();
  Object.assign(p, BASE, overrides);
  return p;
}

// 只留需要存檔的欄位
export function serializeParams(p) {
  const keys = ['wave_type', ...PARAM_GROUPS.flatMap(([, list]) => list.map(([k]) => k)), 'sample_rate', 'sample_size'];
  return Object.fromEntries(keys.map((k) => [k, p[k]]));
}
