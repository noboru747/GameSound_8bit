// 本機音效工作室：網頁介面 + 存檔 API。只聽 127.0.0.1。
//
//   node server.mjs --out <遊戲的 assets/sfx> --project <專案名>
//
//   GET    /                     介面
//   GET    /api/config           輸出位置與專案名
//   GET    /api/library          sfx.json 清單（含檔案是否存在、是否有參數原始檔）
//   GET    /api/source/:id       參數原始檔
//   POST   /api/save             { id, label, category, volume, durationMs, params, wavBase64 }
//   DELETE /api/sound/:id
//   GET    /out/:file            試聽已存的 wav
//   GET    /api/ai/status        ComfyUI 與 Stable Audio Open 模型是否就緒
//   POST   /api/ai/generate      { prompt, negative, seconds, batch, seed, steps, cfg } → 產生的音檔清單
//   GET    /api/ai/audio?…       轉送 ComfyUI 的音檔（避免瀏覽器跨來源）

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { readConfig, TOOL_ROOT } from './lib/config.mjs';
import { createComfy, DEFAULT_NEGATIVE } from './lib/comfy.mjs';
import { createLibrary } from './lib/library.mjs';

const cfg = readConfig();
const lib = createLibrary(cfg);
const comfy = createComfy(cfg.comfyUrl);

const STATIC = {
  '/': ['public/index.html', 'text/html'],
  '/app.mjs': ['public/app.mjs', 'text/javascript'],
  '/audio.mjs': ['public/audio.mjs', 'text/javascript'],
  '/ai.mjs': ['public/ai.mjs', 'text/javascript'],
  '/style.css': ['public/style.css', 'text/css'],
  '/presets.mjs': ['presets.mjs', 'text/javascript'],
  '/lib/riffwave.js': ['node_modules/jsfxr/riffwave.js', 'text/javascript'],
  '/lib/sfxr.js': ['node_modules/jsfxr/sfxr.js', 'text/javascript'],
};

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  try {
    if (req.method === 'GET' && STATIC[p]) {
      const [file, type] = STATIC[p];
      return send(res, 200, fs.readFileSync(path.join(TOOL_ROOT, file)), type);
    }
    if (req.method === 'GET' && p === '/api/config') return send(res, 200, { ...cfg, defaultNegative: DEFAULT_NEGATIVE });
    if (req.method === 'GET' && p === '/api/ai/status') return send(res, 200, await comfy.status());
    if (req.method === 'POST' && p === '/api/ai/generate') {
      return send(res, 200, await comfy.generate(JSON.parse(await readBody(req))));
    }
    if (req.method === 'GET' && p === '/api/ai/audio') {
      const { body, type } = await comfy.audio(Object.fromEntries(url.searchParams));
      return send(res, 200, body, type);
    }
    if (req.method === 'GET' && p === '/api/library') return send(res, 200, lib.list());
    if (req.method === 'GET' && p.startsWith('/api/source/')) {
      const src = lib.source(p.slice('/api/source/'.length));
      return src ? send(res, 200, src) : send(res, 404, { error: '沒有參數原始檔' });
    }
    if (req.method === 'POST' && p === '/api/save') {
      const body = JSON.parse(await readBody(req));
      const saved = lib.save({ ...body, wav: Buffer.from(body.wavBase64, 'base64') });
      return send(res, 200, saved);
    }
    if (req.method === 'DELETE' && p.startsWith('/api/sound/')) {
      lib.remove(p.slice('/api/sound/'.length));
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && p.startsWith('/out/')) {
      const file = lib.wavPath(p.slice('/out/'.length));
      return file ? send(res, 200, fs.readFileSync(file), 'audio/wav') : send(res, 404, { error: '找不到檔案' });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 400, { error: e.message });
  }
});

server.listen(cfg.port, '127.0.0.1', () => {
  console.log(`GameSound 8bit  http://localhost:${cfg.port}`);
  console.log(`  專案     ${cfg.project}  (參數原始檔：${cfg.projectDir})`);
  console.log(`  輸出     ${cfg.outDir}`);
  console.log(`  ComfyUI  ${cfg.comfyUrl}（AI 生成用，可不開）`);
});
