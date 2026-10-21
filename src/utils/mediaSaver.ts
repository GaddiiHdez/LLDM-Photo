import { registerPlugin } from '@capacitor/core';

export interface MediaSaverPlugin {
  /** Guarda una imagen JPG directamente en la Galería de Android (Pictures/<album>) */
  saveImage(options: { data: string; fileName: string; album?: string }): Promise<{ uri: string }>;
}

export const MediaSaver = registerPlugin<MediaSaverPlugin>('MediaSaver');
