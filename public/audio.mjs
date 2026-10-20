// 共用音訊工具：播放、畫波形、量測、WAV 編碼、後處理。8-bit 合成與 AI 生成都用。

export const actx = new AudioContext();

export function playFloats(floats, sampleRate, volume = 1) {
  if (actx.state === 'suspended') actx.resume();
  const buf = actx.createBuffer(1, floats.length, sampleRate);
  buf.getChannelData(0).set(floats);
  const src = actx.createBufferSource();
  const gain = actx.createGain();
  gain.gain.value = volume;
  src.buffer = buf;
  src.connect(gain).connect(actx.destination);
  src.start();
}

export async function decode(arrayBuffer) {
  return actx.decodeAudioData(arrayBuffer);
}

// 多聲道 → 單聲道
export function toMono(audioBuffer) {
  const n = audioBuffer.numberOfChannels;
  const out = new Float32Array(audioBuffer.length);
  for (let c = 0; c < n; c++) {
    const ch = audioBuffer.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] += ch[i] / n;
  }
  return out;
}

export function drawWave(canvas, samples, color = '#f5b041') {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#2a3140';
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  const step = Math.max(1, Math.floor(samples.length / w));
  for (let x = 0; x < w; x++) {
    let min = 1, max = -1;
    for (let i = x * step; i < Math.min(samples.length, (x + 1) * step); i++) {
      if (samples[i] < min) min = samples[i];
      if (samples[i] > max) max = samples[i];
    }
    if (min > max) break;
    ctx.moveTo(x, h / 2 - max * (h / 2 - 4));
    ctx.lineTo(x, h / 2 - min * (h / 2 - 4));
  }
  ctx.stroke();
}

export function measure(samples, sampleRate) {
  let peak = 0, clipping = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
    if (a >= 0.999) clipping++;
  }
  return {
    durationMs: (samples.length / sampleRate) * 1000,
    peak,
    db: peak > 0 ? 20 * Math.log10(peak) : -Infinity,
    clipping,
  };
}

// 檢測結果 → 警告文字
export function warnings(m) {
  const w = [];
  if (m.clipping > 0) w.push('有削波（破音）：降低音量或開啟正規化');
  if (m.durationMs > 1500) w.push('超過 1.5 秒：戰鬥音效建議 1 秒內，避免重疊時太吵');
  if (m.db < -18) w.push('峰值偏小：遊戲裡可能聽不清楚，可開啟正規化');
  return w;
}

// Float32 mono → 16-bit PCM WAV（ArrayBuffer）
export function encodeWav(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

export function toBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// ---------------------------------------------------------------------------
// 後處理（AI 生成的寫實音效 → 遊戲用短音效）

export const CRUSH_MODES = {
  none: { label: '不處理', factor: 1, bits: 16 },
  soft: { label: '輕微（22kHz / 10-bit）', factor: 2, bits: 10 },
  retro: { label: '復古（11kHz / 8-bit）', factor: 4, bits: 8 },
  chip: { label: '強烈（5.5kHz / 6-bit）', factor: 8, bits: 6 },
};

// opts: { threshold, maxMs, fadeMs, crush, normalize }
export function postProcess(input, sampleRate, opts) {
  let s = input;
  // 裁掉頭尾靜音（頭保留 5ms）
  const th = opts.threshold;
  let a = 0, b = s.length - 1;
  while (a < s.length && Math.abs(s[a]) < th) a++;
  while (b > a && Math.abs(s[b]) < th) b--;
  if (a >= b) return new Float32Array(0);
  a = Math.max(0, a - Math.round(sampleRate * 0.005));
  s = s.slice(a, b + 1);
  // 限制最長
  const max = Math.round((sampleRate * opts.maxMs) / 1000);
  if (opts.maxMs > 0 && s.length > max) s = s.slice(0, max);
  // 淡出
  const fade = Math.min(s.length, Math.round((sampleRate * opts.fadeMs) / 1000));
  for (let i = 0; i < fade; i++) s[s.length - fade + i] *= 1 - i / fade;
  // 8-bit 化：取樣保持降取樣 + 量化
  const mode = CRUSH_MODES[opts.crush] ?? CRUSH_MODES.none;
  if (mode.factor > 1 || mode.bits < 16) {
    const levels = 2 ** (mode.bits - 1);
    let hold = 0;
    for (let i = 0; i < s.length; i++) {
      if (i % mode.factor === 0) hold = Math.round(s[i] * levels) / levels;
      s[i] = hold;
    }
  }
  // 正規化到 -1 dBFS
  if (opts.normalize) {
    let peak = 0;
    for (let i = 0; i < s.length; i++) peak = Math.max(peak, Math.abs(s[i]));
    if (peak > 0) {
      const g = 0.89 / peak;
      for (let i = 0; i < s.length; i++) s[i] *= g;
    }
  }
  return s;
}
