// 命令列：一次產生 presets.mjs 的預設音效包（STARTER_PACK）。
//
//   node generate-pack.mjs --out <遊戲的 assets/sfx> --project <專案名> [--force]
//
// 預設跳過已經存在的 id（不覆蓋你在介面調整過的音效）；--force 全部重產。

import jsfxr from 'jsfxr';
import { readConfig } from './lib/config.mjs';
import { createLibrary } from './lib/library.mjs';
import { makeParams, serializeParams, STARTER_PACK } from './presets.mjs';

const cfg = readConfig();
const lib = createLibrary(cfg);
const force = process.argv.includes('--force');
const existing = new Set(lib.list().map((s) => s.id));

let made = 0;
for (const preset of STARTER_PACK) {
  if (existing.has(preset.id) && !force) {
    console.log(`  跳過  ${preset.id}（已存在）`);
    continue;
  }
  const params = makeParams(jsfxr, preset.params);
  const wave = jsfxr.sfxr.toWave(params);
  const durationMs = (wave.buffer.length / params.sample_rate) * 1000;
  lib.save({
    id: preset.id, label: preset.label, category: preset.category, volume: preset.volume,
    durationMs, params: serializeParams(params), wav: Buffer.from(wave.wav),
  });
  console.log(`  產生  ${preset.id.padEnd(18)} ${Math.round(durationMs)}ms${wave.clipping ? `  ⚠ 削波 ${wave.clipping}` : ''}`);
  made++;
}
console.log(`完成：產生 ${made} 個，輸出到 ${cfg.outDir}`);
