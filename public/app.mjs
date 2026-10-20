// 介面：產生 → 調整 → 試聽 / 檢測 → 存檔到遊戲。
// 音效合成用 jsfxr（window.jsfxr，由 index.html 的 <script> 載入）。

import {
  BASE, CATEGORIES, GENERATORS, PARAM_GROUPS, STARTER_PACK, WAVE_TYPES, makeParams, serializeParams,
} from '/presets.mjs';

const jsfxr = window.jsfxr;
const $ = (s) => document.querySelector(s);
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const actx = new AudioContext();

let params = makeParams(jsfxr, STARTER_PACK[0].params);
let wave = null;
let library = [];

// ---------------------------------------------------------------------------
// 合成、試聽、檢測

function render() {
  wave = jsfxr.sfxr.toWave(params);
  drawWave(wave.buffer);
  showStats();
  syncSliders();
}

function playFloats(floats, sampleRate, volume) {
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

const play = () => wave && playFloats(Float32Array.from(wave.buffer), params.sample_rate, currentVolume());

async function playFile(file, volume) {
  if (actx.state === 'suspended') actx.resume();
  const data = await (await fetch(`/out/${file}?t=${Date.now()}`)).arrayBuffer();
  const buf = await actx.decodeAudioData(data);
  const src = actx.createBufferSource();
  const gain = actx.createGain();
  gain.gain.value = volume;
  src.buffer = buf;
  src.connect(gain).connect(actx.destination);
  src.start();
}

function drawWave(samples) {
  const c = $('#wave');
  const ctx = c.getContext('2d');
  const { width: w, height: h } = c;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#2a3140';
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  ctx.strokeStyle = '#f5b041';
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

function measure() {
  const s = wave.buffer;
  let peak = 0;
  for (let i = 0; i < s.length; i++) peak = Math.max(peak, Math.abs(s[i]));
  return {
    durationMs: (s.length / params.sample_rate) * 1000,
    peak,
    db: peak > 0 ? 20 * Math.log10(peak) : -Infinity,
    clipping: wave.clipping ?? 0,
    kb: wave.wav.length / 1024,
  };
}

function showStats() {
  const m = measure();
  $('#stats').innerHTML =
    `<span>長度 <b>${Math.round(m.durationMs)}</b> ms</span>` +
    `<span>峰值 <b>${m.db.toFixed(1)}</b> dBFS</span>` +
    `<span>削波 <b>${m.clipping}</b></span>` +
    `<span>大小 <b>${m.kb.toFixed(1)}</b> KB</span>`;
  const warn = [];
  if (m.clipping > 0) warn.push('有削波（破音）：按「音量正規化」或調低產生音量');
  if (m.durationMs > 1500) warn.push('超過 1.5 秒：戰鬥音效建議 1 秒內，避免重疊時太吵');
  if (m.db < -18) warn.push('峰值偏小：遊戲裡可能聽不清楚，可按「音量正規化」');
  $('#warnings').innerHTML = warn.length
    ? warn.map((t) => `<div>⚠ ${t}</div>`).join('')
    : '<div class="ok">✓ 檢查通過</div>';
}

// 依峰值調整產生音量，讓峰值落在 -1 dBFS 左右
function normalize() {
  for (let i = 0; i < 4; i++) {
    const { peak, clipping } = measure();
    if (peak === 0) return;
    const target = clipping > 0 ? 0.7 : 0.89;
    params.sound_vol = Math.min(1, Math.max(0.01, params.sound_vol * (target / peak)));
    wave = jsfxr.sfxr.toWave(params);
  }
  render();
  if ($('#autoplay').checked) play();
}

// ---------------------------------------------------------------------------
// 參數介面

const sliderEls = new Map();

function buildSliders() {
  $('#wavetype').innerHTML = WAVE_TYPES.map((name, i) =>
    `<label><input type="radio" name="wave" value="${i}" /> ${name}</label>`).join('');
  $('#wavetype').addEventListener('change', (e) => {
    params.wave_type = Number(e.target.value);
    changed();
  });

  const root = $('#sliders');
  for (const [title, list] of PARAM_GROUPS) {
    root.insertAdjacentHTML('beforeend', `<div class="group-title">${title}</div>`);
    for (const [key, label, signed] of list) {
      const row = document.createElement('div');
      row.className = 'slider';
      row.innerHTML = `<span>${label}</span><input type="range" min="${signed ? -1 : 0}" max="1" step="0.001" /><output></output>`;
      const input = row.querySelector('input');
      input.addEventListener('input', () => {
        params[key] = Number(input.value);
        render();
      });
      input.addEventListener('change', () => { if ($('#autoplay').checked) play(); });
      root.appendChild(row);
      sliderEls.set(key, row);
    }
  }
}

function syncSliders() {
  for (const [key, row] of sliderEls) {
    row.querySelector('input').value = params[key];
    row.querySelector('output').textContent = Number(params[key]).toFixed(3);
  }
  const radio = document.querySelector(`#wavetype input[value="${params.wave_type}"]`);
  if (radio) radio.checked = true;
}

function changed() {
  render();
  if ($('#autoplay').checked) play();
}

function setParams(p) {
  params = makeParams(jsfxr, p);
  changed();
}

function setMeta({ id = '', label = '', category = 'skill', volume = 0.5 }) {
  const f = $('#save-form');
  f.id.value = id;
  f.label.value = label;
  f.category.value = category;
  f.volume.value = volume;
  $('#vol-out').textContent = Number(volume).toFixed(2);
}

const currentVolume = () => Number($('#save-form').volume.value);

function buildPresets() {
  const byCat = {};
  for (const p of STARTER_PACK) (byCat[p.category] ??= []).push(p);
  $('#presets').innerHTML = Object.entries(byCat).map(([cat, list]) =>
    `<div class="preset-group"><div class="cat">${CATEGORIES[cat] ?? cat}</div><div class="btn-grid">` +
    list.map((p) => `<button data-preset="${p.id}" title="${p.id}">${p.label}</button>`).join('') +
    '</div></div>').join('');
  $('#presets').addEventListener('click', (e) => {
    const p = STARTER_PACK.find((x) => x.id === e.target.dataset.preset);
    if (!p) return;
    setMeta(p);
    setParams(p.params);
  });

  $('#generators').innerHTML = GENERATORS.map(([fn, label]) => `<button data-gen="${fn}">${label}</button>`).join('');
  $('#generators').addEventListener('click', (e) => {
    const fn = e.target.dataset.gen;
    if (!fn) return;
    const p = new jsfxr.Params();
    p[fn]();
    setParams({ ...serializeParams(p), sound_vol: BASE.sound_vol });
  });
  $('#mutate').addEventListener('click', () => {
    params.mutate();
    changed();
  });
}

// ---------------------------------------------------------------------------
// 存檔與音效庫

function buildForm() {
  const f = $('#save-form');
  f.category.innerHTML = Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}（${k}）</option>`).join('');
  f.volume.addEventListener('input', () => { $('#vol-out').textContent = Number(f.volume.value).toFixed(2); });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = f.id.value.trim();
    if (!ID_RE.test(id)) return msg('id 只能用小寫英數與 -（例：cast-line）', true);
    if (library.some((s) => s.id === id) && !confirm(`${id} 已存在，要覆蓋嗎？`)) return;
    await save({ id, label: f.label.value.trim() || id, category: f.category.value, volume: currentVolume() });
    msg(`已存檔 ${id}.wav`);
  });
}

async function save(meta, p = params, w = wave) {
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...meta,
      durationMs: (w.buffer.length / p.sample_rate) * 1000,
      params: serializeParams(p),
      wavBase64: w.dataURI.split(',')[1],
    }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  await loadLibrary();
}

function msg(text, bad = false) {
  const el = $('#save-msg');
  el.textContent = text;
  el.style.color = bad ? 'var(--bad)' : 'var(--ok)';
}

async function loadLibrary() {
  library = await (await fetch('/api/library')).json();
  $('#lib-count').textContent = `${library.length} 個`;

  const missing = STARTER_PACK.filter((p) => !library.some((s) => s.id === p.id));
  $('#missing').innerHTML = missing.length
    ? `預設包還缺 ${missing.length} 個：${missing.map((p) => p.id).join('、')} <button class="small" id="fill">產生缺少的</button>`
    : '';
  $('#fill')?.addEventListener('click', async () => {
    for (const p of missing) {
      const pp = makeParams(jsfxr, p.params);
      await save(p, pp, jsfxr.sfxr.toWave(pp));
    }
  });

  const byCat = {};
  for (const s of library) (byCat[s.category] ??= []).push(s);
  $('#library').innerHTML = Object.entries(byCat).map(([cat, list]) =>
    `<div class="cat">${CATEGORIES[cat] ?? cat}</div>` + list.map((s) => `
      <div class="row">
        <div class="name">${s.label} <span class="muted">${s.id}</span></div>
        <div class="meta">${s.durationMs}ms・音量 ${s.volume}${s.fileExists ? '' : ' <span class="flag">檔案遺失</span>'}${s.hasSource ? '' : ' <span class="flag">無參數檔</span>'}</div>
        <div class="actions">
          <button class="small" data-play="${s.id}">▶</button>
          <button class="small" data-load="${s.id}" ${s.hasSource ? '' : 'disabled'}>載入</button>
          <button class="small danger" data-del="${s.id}">刪除</button>
        </div>
      </div>`).join('')).join('');
}

function bindLibrary() {
  $('#library').addEventListener('click', async (e) => {
    const t = e.target;
    const s = library.find((x) => x.id === (t.dataset.play ?? t.dataset.load ?? t.dataset.del));
    if (!s) return;
    if (t.dataset.play) playFile(s.file, s.volume);
    if (t.dataset.load) {
      const src = await (await fetch(`/api/source/${s.id}`)).json();
      setMeta(src);
      setParams(src.params);
    }
    if (t.dataset.del && confirm(`刪除 ${s.id}？遊戲裡引用它的地方會變成無聲`)) {
      await fetch(`/api/sound/${s.id}`, { method: 'DELETE' });
      await loadLibrary();
    }
  });
}

// ---------------------------------------------------------------------------

async function init() {
  const cfg = await (await fetch('/api/config')).json();
  $('#target').textContent = `專案 ${cfg.project} → 輸出 ${cfg.outDir}`;
  buildSliders();
  buildPresets();
  buildForm();
  bindLibrary();
  $('#play').addEventListener('click', play);
  $('#normalize').addEventListener('click', normalize);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      play();
    }
  });
  setMeta(STARTER_PACK[0]);
  render();
  await loadLibrary();
}

init();
