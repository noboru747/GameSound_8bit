// AI 生成分頁：英文描述 → ComfyUI（Stable Audio Open）一次產生數個候選 → 挑一個 → 後處理 → 交給存檔。
//
// 對外：initAi({ onChange }) 回傳 { current(), load(source), activate() }
//   current() → { samples, sampleRate, source } | null   目前後處理完的結果（給存檔用）

import { CRUSH_MODES, decode, drawWave, measure, playFloats, postProcess, toMono, warnings } from './audio.mjs';

// 模型只看得懂英文；這些是起點，可以自己改
export const PROMPT_TEMPLATES = [
  ['skill', '火焰噴射', 'short fire whoosh, flamethrower burst, crackling flames, game sound effect'],
  ['skill', '鬼火', 'eerie ghostly whoosh, spectral flame, magical, game sound effect'],
  ['skill', '突進', 'very fast swoosh, quick air whoosh, game sound effect'],
  ['skill', '蓄力', 'magic energy charging up, rising hum, game sound effect'],
  ['impact', '爆炸', 'short explosion boom with debris, game sound effect'],
  ['impact', '魔法落地', 'magic impact burst, soft whoomp, game sound effect'],
  ['hit', '受擊', 'punch impact, short hit thud, game sound effect'],
  ['hit', '重擊', 'heavy critical hit, strong punch smack, game sound effect'],
  ['status', '電擊', 'electric zap, short static crackle, game sound effect'],
  ['status', '冰凍', 'ice crystal freezing crackle, glassy shimmer, game sound effect'],
  ['status', '中毒', 'bubbling poison gurgle, short, game sound effect'],
  ['status', '睡眠', 'soft sleepy chime, gentle, calm, game sound effect'],
  ['item', '補血', 'magical healing chime, sparkling shimmer, game sound effect'],
  ['unit', '倒下', 'creature defeated, body falling thud, game sound effect'],
  ['ui', '按鈕', 'short soft UI click, button press'],
];

const $ = (s) => document.querySelector(s);

export function initAi({ onChange, defaultNegative }) {
  let candidates = []; // { samples, sampleRate, file }
  let picked = -1;
  let processed = null;
  let lastRequest = null;

  const form = $('#ai-form');
  form.negative.value = defaultNegative;

  $('#ai-templates').innerHTML = PROMPT_TEMPLATES.map(([, label, prompt], i) =>
    `<button type="button" class="small" data-tpl="${i}" title="${prompt}">${label}</button>`).join('');
  $('#ai-templates').addEventListener('click', (e) => {
    const t = PROMPT_TEMPLATES[e.target.dataset.tpl];
    if (t) form.prompt.value = t[2];
  });

  async function refreshStatus() {
    const st = await (await fetch('/api/ai/status')).json();
    const el = $('#ai-status');
    el.textContent = st.message;
    el.className = st.ready ? 'ok' : 'bad';
    $('#ai-generate').disabled = !st.ready;
    return st;
  }

  function settings() {
    return {
      prompt: form.prompt.value.trim(),
      negative: form.negative.value.trim(),
      seconds: Number(form.seconds.value),
      batch: Number(form.batch.value),
      seed: form.randomSeed.checked ? Math.floor(Math.random() * 2 ** 31) : Number(form.seed.value),
      steps: Number(form.steps.value),
      cfg: Number(form.cfg.value),
    };
  }

  function post() {
    return {
      threshold: Number(form.threshold.value),
      maxMs: Number(form.maxMs.value),
      fadeMs: Number(form.fadeMs.value),
      crush: form.crush.value,
      normalize: form.normalize.checked,
    };
  }

  async function generate() {
    const req = settings();
    if (!req.prompt) return;
    form.seed.value = req.seed;
    lastRequest = req;
    const btn = $('#ai-generate');
    btn.disabled = true;
    btn.textContent = '產生中…（第一次要載入模型，會比較久）';
    $('#ai-error').textContent = '';
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req),
      });
      const files = await res.json();
      if (!res.ok) throw new Error(files.error);
      candidates = [];
      for (const f of files) {
        const data = await (await fetch(`/api/ai/audio?${new URLSearchParams(f)}`)).arrayBuffer();
        const buf = await decode(data);
        candidates.push({ samples: toMono(buf), sampleRate: buf.sampleRate, file: f.filename });
      }
      picked = -1;
      processed = null;
      renderCandidates();
      if (candidates.length) pick(0);
    } catch (e) {
      $('#ai-error').textContent = e.message;
    } finally {
      btn.disabled = false;
      btn.textContent = '✨ 產生';
    }
  }

  function renderCandidates() {
    $('#ai-candidates').innerHTML = candidates.map((c, i) => `
      <div class="cand${i === picked ? ' picked' : ''}" data-i="${i}">
        <canvas width="220" height="54"></canvas>
        <div class="cand-actions">
          <button type="button" class="small" data-play="${i}">▶</button>
          <button type="button" class="small" data-pick="${i}">${i === picked ? '✓ 已選' : '選用'}</button>
          <span class="muted">#${i + 1}</span>
        </div>
      </div>`).join('');
    document.querySelectorAll('#ai-candidates .cand').forEach((el, i) => drawWave(el.querySelector('canvas'), candidates[i].samples, '#7dd3fc'));
  }

  function pick(i) {
    picked = i;
    renderCandidates();
    reprocess(true);
  }

  function reprocess(autoplay) {
    const c = candidates[picked];
    if (!c) return;
    processed = { samples: postProcess(Float32Array.from(c.samples), c.sampleRate, post()), sampleRate: c.sampleRate };
    drawWave($('#ai-wave'), processed.samples);
    const m = measure(processed.samples, processed.sampleRate);
    $('#ai-stats').innerHTML =
      `<span>長度 <b>${Math.round(m.durationMs)}</b> ms</span><span>峰值 <b>${m.db.toFixed(1)}</b> dBFS</span><span>削波 <b>${m.clipping}</b></span>`;
    const w = warnings(m);
    $('#ai-warnings').innerHTML = w.length ? w.map((t) => `<div>⚠ ${t}</div>`).join('') : '<div class="ok">✓ 檢查通過</div>';
    onChange();
    if (autoplay && $('#autoplay').checked) play();
  }

  const play = () => processed && playFloats(processed.samples, processed.sampleRate, Number($('#save-form').volume.value));

  $('#ai-generate').addEventListener('click', generate);
  $('#ai-play').addEventListener('click', play);
  $('#ai-candidates').addEventListener('click', (e) => {
    const t = e.target;
    if (t.dataset.play) playFloats(candidates[t.dataset.play].samples, candidates[t.dataset.play].sampleRate, 0.8);
    if (t.dataset.pick) pick(Number(t.dataset.pick));
  });
  form.crush.innerHTML = Object.entries(CRUSH_MODES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  for (const name of ['threshold', 'maxMs', 'fadeMs', 'crush', 'normalize']) {
    form[name].addEventListener('change', () => reprocess(true));
  }

  return {
    activate: refreshStatus,
    play,
    current() {
      if (!processed || !processed.samples.length) return null;
      return {
        ...processed,
        source: { kind: 'ai', model: 'stable-audio-open-1.0', ...(lastRequest ?? settings()), candidate: picked, post: post() },
      };
    },
    // 載入參數原始檔：填回設定（同一個 seed 重新產生會得到同一批候選）
    load(src) {
      for (const k of ['prompt', 'negative', 'seconds', 'batch', 'seed', 'steps', 'cfg']) if (src[k] != null) form[k].value = src[k];
      form.randomSeed.checked = false;
      if (src.post) {
        for (const k of ['threshold', 'maxMs', 'fadeMs', 'crush']) form[k].value = src.post[k];
        form.normalize.checked = !!src.post.normalize;
      }
      candidates = [];
      processed = null;
      renderCandidates();
      $('#ai-error').textContent = '已載入設定：按「產生」用同一個 seed 重新產生';
    },
  };
}
