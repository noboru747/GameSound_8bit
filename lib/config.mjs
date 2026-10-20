// 命令列參數 / 環境變數 → 輸出位置。
//
//   --out <資料夾>      wav 與 sfx.json 輸出到哪（通常是遊戲的 public/assets/sfx）
//   --project <名稱>    參數原始檔放在 projects/<名稱>/
//   --port <數字>       介面的 port（預設 5300）
//   --comfy <網址>      AI 生成用的 ComfyUI（預設 http://127.0.0.1:8188）
//
// 也可用環境變數 SFX_OUT / SFX_PROJECT / SFX_PORT / SFX_COMFY。

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readConfig(argv = process.argv.slice(2)) {
  const arg = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const project = arg('project') ?? process.env.SFX_PROJECT ?? 'default';
  const out = arg('out') ?? process.env.SFX_OUT ?? path.join(TOOL_ROOT, 'output', project);
  return {
    project,
    outDir: path.resolve(out),
    projectDir: path.join(TOOL_ROOT, 'projects', project),
    port: Number(arg('port') ?? process.env.SFX_PORT ?? 5300),
    comfyUrl: (arg('comfy') ?? process.env.SFX_COMFY ?? 'http://127.0.0.1:8188').replace(/\/$/, ''),
  };
}
