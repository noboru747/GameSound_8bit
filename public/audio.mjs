// 共用音訊工具：播放、解碼、畫波形、檢測警告。

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


// 檢測結果 → 警告文字
export function warnings(m) {
  const w = [];
  if (m.clipping > 0) w.push('有削波（破音）：降低音量或開啟正規化');
  if (m.durationMs > 1500) w.push('超過 1.5 秒：戰鬥音效建議 1 秒內，避免重疊時太吵');
  if (m.db < -18) w.push('峰值偏小：遊戲裡可能聽不清楚，可開啟正規化');
  return w;
}
