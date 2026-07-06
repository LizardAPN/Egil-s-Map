export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  blurhash: string;
}

export interface UploadProgress {
  index: number;
  total: number;
  phase: "preparing" | "uploading" | "saving";
}

export function buildPinMediaStoragePath(
  userId: string,
  pinId: string,
  fileId: string,
): string {
  return `${userId}/${pinId}/${fileId}.webp`;
}

export function scaleToMaxLongestSide(
  width: number,
  height: number,
  maxLongestSide: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);

  if (longest <= maxLongestSide) {
    return { width, height };
  }

  const scale = maxLongestSide / longest;

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}
