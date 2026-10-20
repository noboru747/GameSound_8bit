// 透過本機 ComfyUI 跑 Stable Audio Open（Stability AI Community License：年營收 < 100 萬美元可商用，產出歸使用者）。
//
// 需要的模型（放在 ComfyUI 的 models/）：
//   checkpoints/stable-audio-open-1.0.safetensors
//   text_encoders/t5_base.safetensors
//
// 流程：組 workflow → POST /prompt → 輪詢 /history/<id> → 回傳輸出檔資訊；音檔用 /view 取。

export const MODEL_FILES = {
  checkpoint: 'stable-audio-open-1.0.safetensors',
  textEncoder: 't5_base.safetensors',
};

export const DEFAULT_NEGATIVE = 'music, melody, singing, speech, voice, talking, low quality, distorted, hum, background noise';

// 模型最短 1 秒；短音效先產 1~3 秒，再由介面裁切
export function buildWorkflow({ prompt, negative = DEFAULT_NEGATIVE, seconds = 1.5, batch = 4, seed, steps = 50, cfg = 7 }) {
  const secs = Math.max(1, Math.min(10, Number(seconds)));
  return {
    1: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: MODEL_FILES.checkpoint } },
    2: { class_type: 'CLIPLoader', inputs: { clip_name: MODEL_FILES.textEncoder, type: 'stable_audio' } },
    3: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['2', 0] } },
    4: { class_type: 'CLIPTextEncode', inputs: { text: negative, clip: ['2', 0] } },
    5: { class_type: 'ConditioningStableAudio', inputs: { positive: ['3', 0], negative: ['4', 0], seconds_start: 0, seconds_total: secs } },
    6: { class_type: 'EmptyLatentAudio', inputs: { seconds: secs, batch_size: Math.max(1, Math.min(8, Number(batch))) } },
    7: {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0], positive: ['5', 0], negative: ['5', 1], latent_image: ['6', 0],
        seed: Number(seed), steps: Number(steps), cfg: Number(cfg),
        sampler_name: 'dpmpp_3m_sde_gpu', scheduler: 'exponential', denoise: 1,
      },
    },
    8: { class_type: 'VAEDecodeAudio', inputs: { samples: ['7', 0], vae: ['1', 2] } },
    9: { class_type: 'SaveAudio', inputs: { audio: ['8', 0], filename_prefix: 'gamesound/sfx' } },
  };
}

export function createComfy(baseUrl) {
  const call = async (path, init) => {
    const res = await fetch(`${baseUrl}${path}`, init);
    if (!res.ok) throw new Error(`ComfyUI ${path} → ${res.status} ${await res.text().catch(() => '')}`.slice(0, 400));
    return res;
  };

  return {
    baseUrl,

    // ComfyUI 是否在跑、模型是否就緒
    async status() {
      try {
        await call('/system_stats');
      } catch {
        return { online: false, ready: false, message: `連不到 ComfyUI（${baseUrl}），請先啟動` };
      }
      const info = await (await call('/object_info/CheckpointLoaderSimple')).json();
      const ckpts = info.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
      const enc = await (await call('/object_info/CLIPLoader')).json();
      const encs = enc.CLIPLoader?.input?.required?.clip_name?.[0] ?? [];
      const missing = [
        ...(ckpts.includes(MODEL_FILES.checkpoint) ? [] : [`checkpoints/${MODEL_FILES.checkpoint}`]),
        ...(encs.includes(MODEL_FILES.textEncoder) ? [] : [`text_encoders/${MODEL_FILES.textEncoder}`]),
      ];
      return {
        online: true,
        ready: missing.length === 0,
        message: missing.length ? `ComfyUI 缺少模型：${missing.join('、')}` : 'Stable Audio Open 就緒',
      };
    },

    // 產生並等待完成，回傳輸出檔清單 [{ filename, subfolder, type }]
    async generate(opts, timeoutMs = 300000) {
      const { prompt_id } = await (await call('/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildWorkflow(opts), client_id: 'gamesound-8bit' }),
      })).json();
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        await new Promise((r) => setTimeout(r, 700));
        const hist = await (await call(`/history/${prompt_id}`)).json();
        const entry = hist[prompt_id];
        if (!entry) continue;
        if (entry.status?.status_str === 'error') {
          const msg = entry.status.messages?.find((m) => m[0] === 'execution_error')?.[1]?.exception_message;
          throw new Error(`ComfyUI 執行失敗：${msg ?? '未知錯誤'}`);
        }
        const audio = Object.values(entry.outputs ?? {}).flatMap((o) => o.audio ?? []);
        if (audio.length) return audio;
      }
      throw new Error('ComfyUI 產生逾時');
    },

    async audio({ filename, subfolder = '', type = 'output' }) {
      const q = new URLSearchParams({ filename, subfolder, type });
      const res = await call(`/view?${q}`);
      return { body: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') ?? 'audio/flac' };
    },
  };
}
