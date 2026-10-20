# GameSound 8bit

8-bit 遊戲音效工作室。在瀏覽器裡產生、調整、試聽、檢測短音效，存成 `.wav` + `sfx.json` 清單，讓遊戲直接套用。

產生音效的程式與參數只留在這個工具裡；遊戲端只拿到 wav 檔與清單。

## 使用

```bash
npm install

# 開介面：--out 指到遊戲的音效資料夾，--project 決定參數原始檔放哪
npm start -- --out ../../noboru/pokemoba/apps/client/public/assets/sfx --project mobaRPG
# → http://localhost:5300

# 或不開介面，直接產生整套預設音效（已存在的 id 會跳過；--force 全部重產）
npm run pack -- --out <遊戲的 assets/sfx> --project mobaRPG
```

也可以用環境變數 `SFX_OUT`、`SFX_PROJECT`、`SFX_PORT`。沒給 `--out` 時輸出到 `output/<project>/`。

## 介面

| 區塊 | 功能 |
|---|---|
| 遊戲預設 | 預設音效包（施放、命中、受擊、狀態、道具、單位、介面），參數固定、可重現 |
| 隨機產生 | jsfxr 內建產生器（拾取、雷射、爆炸、強化、受擊、跳躍…）與「變異」微調 |
| 參數 | 波形 + 23 個參數滑桿；調整後自動試聽（Space 也能播放） |
| 檢測 | 波形、長度、峰值 dBFS、削波數、檔案大小；削波 / 太長 / 太小聲會警告；一鍵音量正規化 |
| 存檔到遊戲 | id（遊戲引用用）、名稱、分類、播放音量 |
| 音效庫 | 列出已存的音效：試聽 wav 檔、載入參數繼續調、刪除；標出檔案遺失 / 沒有參數檔；預設包缺少的 id 可一鍵補齊 |

## 輸出格式

```
<out>/
├─ <id>.wav          16-bit / 44.1kHz mono
└─ sfx.json          { version: 1, sounds: { <id>: { file, label, category, volume, durationMs } } }

projects/<project>/<id>.json   參數原始檔（工具用，不給遊戲）
```

遊戲端讀 `sfx.json`，以 id 引用音效、用 `volume` 當播放音量。id 只能用小寫英數與 `-`。

## 結構

```
server.mjs          本機伺服器（只聽 127.0.0.1）：介面 + 存檔 API
generate-pack.mjs   命令列產生預設音效包
presets.mjs         參數說明、分類、預設音效包（瀏覽器與 Node 共用）
lib/config.mjs      命令列參數 / 環境變數
lib/library.mjs     存 / 讀 / 刪（伺服器與命令列共用）
public/             介面（index.html、app.mjs、style.css）
projects/           各專案的參數原始檔
```

## 授權

音效合成使用 [jsfxr](https://github.com/chr15m/jsfxr)（Unlicense，公有領域）。用這個工具產生的音效歸產生者所有，可自由用於商業或非商業作品。
