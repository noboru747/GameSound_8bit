// 音效庫：存 / 讀 / 刪。伺服器與命令列共用。
//
//   輸出資料夾（遊戲用）   <out>/<id>.wav、<out>/sfx.json（清單：檔名、名稱、分類、音量、長度）
//   專案資料夾（工具用）   projects/<project>/<id>.json（參數原始檔，之後可載回來調整）

import fs from 'node:fs';
import path from 'node:path';

export const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function createLibrary({ outDir, projectDir }) {
  const manifestPath = path.join(outDir, 'sfx.json');

  const readManifest = () => {
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      return { version: 1, sounds: {} };
    }
  };

  const writeManifest = (m) => {
    fs.mkdirSync(outDir, { recursive: true });
    const sorted = Object.fromEntries(Object.entries(m.sounds).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(manifestPath, JSON.stringify({ version: 1, sounds: sorted }, null, 2));
  };

  return {
    outDir,
    projectDir,

    list() {
      const m = readManifest();
      return Object.entries(m.sounds).map(([id, s]) => ({
        id, ...s,
        hasSource: fs.existsSync(path.join(projectDir, `${id}.json`)),
        fileExists: fs.existsSync(path.join(outDir, s.file)),
      }));
    },

    source(id) {
      if (!ID_RE.test(id)) return null;
      try {
        return JSON.parse(fs.readFileSync(path.join(projectDir, `${id}.json`), 'utf8'));
      } catch {
        return null;
      }
    },

    // wav: Buffer
    save({ id, label, category, volume, durationMs, params, wav }) {
      if (!ID_RE.test(id)) throw new Error(`id 只能用小寫英數與 -：${id}`);
      fs.mkdirSync(outDir, { recursive: true });
      fs.mkdirSync(projectDir, { recursive: true });
      const file = `${id}.wav`;
      fs.writeFileSync(path.join(outDir, file), wav);
      fs.writeFileSync(path.join(projectDir, `${id}.json`), JSON.stringify({ id, label, category, volume, params }, null, 2));
      const m = readManifest();
      m.sounds[id] = { file, label, category, volume: Number(volume), durationMs: Math.round(durationMs) };
      writeManifest(m);
      return m.sounds[id];
    },

    remove(id) {
      if (!ID_RE.test(id)) throw new Error(`不合法的 id：${id}`);
      const m = readManifest();
      const s = m.sounds[id];
      if (s) fs.rmSync(path.join(outDir, s.file), { force: true });
      fs.rmSync(path.join(projectDir, `${id}.json`), { force: true });
      delete m.sounds[id];
      writeManifest(m);
    },

    wavPath(file) {
      const p = path.join(outDir, path.basename(file));
      return fs.existsSync(p) ? p : null;
    },
  };
}
