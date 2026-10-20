# GameSound 8bit

遊戲音效工作室。兩種來源——**8-bit 合成**（jsfxr）與 **AI 生成**（Stable Audio Open，透過本機 ComfyUI）——在瀏覽器裡產生、調整、試聽、檢測，存成 `.wav` + `sfx.json` 清單，讓遊戲直接套用。

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

## 介面：8-bit 合成

| 區塊 | 功能 |
|---|---|
| 遊戲預設 | 預設音效包（施放、命中、受擊、狀態、道具、單位、介面），參數固定、可重現 |
| 隨機產生 | jsfxr 內建產生器（拾取、雷射、爆炸、強化、受擊、跳躍…）與「變異」微調 |
| 參數 | 波形 + 23 個參數滑桿；調整後自動試聽（Space 也能播放） |
| 檢測 | 波形、長度、峰值 dBFS、削波數、檔案大小；削波 / 太長 / 太小聲會警告；一鍵音量正規化 |
| 存檔到遊戲 | id（遊戲引用用）、名稱、分類、播放音量 |
| 音效庫 | 列出已存的音效：試聽 wav 檔、載入參數繼續調、刪除；標出檔案遺失 / 沒有參數檔；預設包缺少的 id 可一鍵補齊 |

## 介面：AI 生成（Stable Audio Open）

| 區塊 | 功能 |
|---|---|
| 描述 | 英文描述（模型只懂英文），附各分類範本；不要的內容（negative prompt） |
| 產生 | 長度（1~10 秒）、候選數量、步數、CFG、seed（可固定以重現） |
| 候選 | 一次產生數個版本，各自試聽、選用 |
| 後處理 | 裁掉頭尾靜音、限制最長、淡出、轉單聲道、**8-bit 化**（降取樣 + 位元壓縮，搭配像素風格）、音量正規化 |

存檔與音效庫跟 8-bit 合成共用；參數原始檔記下描述、seed、選了第幾個候選與後處理設定，「載入」後用同一個 seed 可重新產生。

### 準備

1. 在 Hugging Face 同意 [stabilityai/stable-audio-open-1.0](https://huggingface.co/stabilityai/stable-audio-open-1.0) 的條款，終端機 `hf auth login`
2. 下載到 ComfyUI 的 models/：
   - `model.safetensors` → `checkpoints/stable-audio-open-1.0.safetensors`
   - `text_encoder/model.safetensors` → `text_encoders/t5_base.safetensors`
3. 啟動 ComfyUI（預設 `http://127.0.0.1:8188`，可用 `--comfy <網址>` 指定），介面的 AI 分頁會顯示是否就緒

### 授權

Stable Audio Open 採 [Stability AI Community License](https://stability.ai/license)：**年營收低於 100 萬美元可商用**，產生的音效歸使用者所有；不可用來訓練新的基礎模型。超過門檻需購買企業授權。

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
server.mjs          本機伺服器（只聽 127.0.0.1）：介面 + 存檔 API + 轉送 ComfyUI
generate-pack.mjs   命令列產生預設音效包
presets.mjs         參數說明、分類、預設音效包（瀏覽器與 Node 共用）
lib/config.mjs      命令列參數 / 環境變數
lib/library.mjs     存 / 讀 / 刪（伺服器與命令列共用）
lib/comfy.mjs       Stable Audio Open workflow 與 ComfyUI API
public/             介面：app.mjs（主程式、8-bit 合成）、ai.mjs（AI 生成）、audio.mjs（播放、波形、WAV、後處理）
projects/           各專案的參數原始檔
```

## 授權

- 8-bit 合成使用 [jsfxr](https://github.com/chr15m/jsfxr)（Unlicense，公有領域），產生的音效可自由用於商業或非商業作品
- AI 生成使用 Stable Audio Open（見上方授權條件）；模型檔不在這個 repo，需自行下載
