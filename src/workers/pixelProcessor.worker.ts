import { processImagePixels, type PixelScratchRef } from '../utils/pixelFilters';
import type { ImageAdjustments } from '../types/editor';

interface ProcessPixelsRequest {
  type: 'process';
  id: number;
  buffer: ArrayBuffer;
  width: number;
  height: number;
  adjustments: ImageAdjustments;
  skipSharpness: boolean;
}

interface ReleaseBufferRequest {
  type: 'release';
}

type WorkerRequest = ProcessPixelsRequest | ReleaseBufferRequest;

const scratchRef: PixelScratchRef = { buffer: null };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type === 'release') {
    scratchRef.buffer = null;
    return;
  }

  try {
    const pixels = new Uint8ClampedArray(msg.buffer);
    processImagePixels(
      pixels,
      msg.width,
      msg.height,
      msg.adjustments,
      msg.skipSharpness,
      scratchRef
    );
    (self as unknown as Worker).postMessage(
      { id: msg.id, ok: true, buffer: pixels.buffer },
      [pixels.buffer]
    );
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id: msg.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      buffer: msg.buffer,
    }, [msg.buffer]);
  }
};
