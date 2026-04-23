import { useCallback, useState } from 'react';

export type FrameStreamEvent =
  | { type: 'init'; total_scenes: number; vertical: string; model: string }
  | { type: 'stage'; scene_number: number; status: 'starting' | 'generating' | 'uploading' }
  | { type: 'frame'; scene_number: number; image_url: string | null; error?: string }
  | { type: 'compliance'; rewrites: Array<{ scene_number: number; field: string; findings: any[] }> }
  | {
      type: 'done';
      generated_count: number;
      total_scenes: number;
      status: 'completed' | 'failed';
      format?: string;
      resolution?: string;
      quality_tier?: string;
      model_used?: string;
    }
  | { type: 'error'; message: string };

export interface SceneFrame {
  scene_number: number;
  image_url: string | null;
  error?: string;
}

export interface FrameProgress {
  scene_number: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  image_url: string | null;
  error?: string;
}

export interface UseFrameStreamResult {
  isStreaming: boolean;
  totalScenes: number;
  generatedCount: number;
  failedCount: number;
  progress: FrameProgress[];
  finalStatus: 'idle' | 'completed' | 'failed';
  modelUsed?: string;
  start: (body: Record<string, any>) => Promise<SceneFrame[]>;
  reset: () => void;
}

/**
 * Streams the generate-video-ad NDJSON response and exposes per-scene progress
 * so the UI can render frames as they finish (instead of waiting for all).
 */
export function useFrameStream(): UseFrameStreamResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const [totalScenes, setTotalScenes] = useState(0);
  const [progress, setProgress] = useState<FrameProgress[]>([]);
  const [finalStatus, setFinalStatus] = useState<'idle' | 'completed' | 'failed'>('idle');
  const [modelUsed, setModelUsed] = useState<string | undefined>();

  const reset = useCallback(() => {
    setIsStreaming(false);
    setTotalScenes(0);
    setProgress([]);
    setFinalStatus('idle');
    setModelUsed(undefined);
  }, []);

  const start = useCallback(async (body: Record<string, any>): Promise<SceneFrame[]> => {
    setIsStreaming(true);
    setProgress([]);
    setFinalStatus('idle');
    const collected: SceneFrame[] = [];

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-ad?stream=1`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ ...body, stream: true }),
    });

    if (!resp.ok || !resp.body) {
      setIsStreaming(false);
      setFinalStatus('failed');
      // Try to surface JSON error body
      try {
        const j = await resp.json();
        throw new Error(j.error || `HTTP ${resp.status}`);
      } catch {
        throw new Error(`HTTP ${resp.status}`);
      }
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const handleEvent = (evt: FrameStreamEvent) => {
      switch (evt.type) {
        case 'init': {
          setTotalScenes(evt.total_scenes);
          setModelUsed(evt.model);
          setProgress(
            Array.from({ length: evt.total_scenes }, (_, i) => ({
              scene_number: i + 1,
              status: 'pending',
              image_url: null,
            }))
          );
          break;
        }
        case 'stage': {
          setProgress((prev) =>
            prev.map((p) =>
              p.scene_number === evt.scene_number
                ? { ...p, status: evt.status === 'generating' ? 'generating' : p.status }
                : p
            )
          );
          break;
        }
        case 'frame': {
          collected.push({ scene_number: evt.scene_number, image_url: evt.image_url, error: evt.error });
          setProgress((prev) =>
            prev.map((p) =>
              p.scene_number === evt.scene_number
                ? {
                    ...p,
                    status: evt.image_url ? 'completed' : 'failed',
                    image_url: evt.image_url,
                    error: evt.error,
                  }
                : p
            )
          );
          break;
        }
        case 'done': {
          setFinalStatus(evt.status);
          break;
        }
        case 'error': {
          setFinalStatus('failed');
          break;
        }
        case 'compliance':
        default:
          break;
      }
    };

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        // eslint-disable-next-line no-cond-assign
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);
          if (!line) continue;
          try {
            handleEvent(JSON.parse(line) as FrameStreamEvent);
          } catch {
            // partial JSON | put back and wait for more
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
      // Flush trailing JSON if any
      if (buffer.trim()) {
        try {
          handleEvent(JSON.parse(buffer.trim()) as FrameStreamEvent);
        } catch {
          /* noop */
        }
      }
    } finally {
      setIsStreaming(false);
    }

    return collected.sort((a, b) => a.scene_number - b.scene_number);
  }, []);

  const generatedCount = progress.filter((p) => p.status === 'completed').length;
  const failedCount = progress.filter((p) => p.status === 'failed').length;

  return {
    isStreaming,
    totalScenes,
    generatedCount,
    failedCount,
    progress,
    finalStatus,
    modelUsed,
    start,
    reset,
  };
}
