export interface ValidatedFilesResult {
  validFiles: File[];
  rejectedNames: string[];
  reasonSummary: string | null;
}

const ALLOWED_IMAGE_EXT_RE = /\.(jpe?g|png|webp|heic|heif|bmp|gif|tiff?|cr2|nef|arw|dng|raf|orf|pef)$/i;

export function isSupportedImageFile(file: Pick<File, 'name' | 'type' | 'size'>): boolean {
  if (!file || typeof file.size !== 'number' || file.size <= 0) {
    return false;
  }
  if (file.type && file.type.startsWith('image/')) {
    return true;
  }
  return ALLOWED_IMAGE_EXT_RE.test(file.name || '');
}

export function validateIncomingMediaFiles(files: FileList | File[]): ValidatedFilesResult {
  const list = Array.from(files || []);
  const validFiles: File[] = [];
  const rejectedNames: string[] = [];

  for (const f of list) {
    if (isSupportedImageFile(f)) {
      validFiles.push(f);
    } else {
      rejectedNames.push(f?.name || 'archivo sin nombre');
    }
  }

  let reasonSummary: string | null = null;
  if (rejectedNames.length > 0) {
    reasonSummary =
      rejectedNames.length === 1
        ? `Archivo omitido (vacío o formato no compatible): ${rejectedNames[0]}`
        : `${rejectedNames.length} archivos omitidos por estar vacíos o tener formato no compatible`;
  }

  return {
    validFiles,
    rejectedNames,
    reasonSummary,
  };
}
