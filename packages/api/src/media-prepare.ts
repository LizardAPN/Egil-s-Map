import { encode } from "blurhash";

import { ApiError } from "./errors";
import {
  scaleToMaxLongestSide,
  type PreparedImage,
} from "./media-shared";

const MAX_IMAGE_LONGEST_SIDE = 2560;
const BLURHASH_LONGEST_SIDE = 32;
const WEBP_QUALITY = 0.82;
const BLURHASH_X_COMPONENTS = 4;
const BLURHASH_Y_COMPONENTS = 3;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ApiError("image_encode_failed", "Failed to encode image"));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function drawBitmapToCanvas(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new ApiError("canvas_unavailable", "Canvas is not available");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function computeBlurhashFromCanvas(canvas: HTMLCanvasElement): string {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new ApiError("canvas_unavailable", "Canvas is not available");
  }

  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);

  return encode(
    imageData.data,
    width,
    height,
    BLURHASH_X_COMPONENTS,
    BLURHASH_Y_COMPONENTS,
  );
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;

  const { width, height } = scaleToMaxLongestSide(
    sourceWidth,
    sourceHeight,
    MAX_IMAGE_LONGEST_SIDE,
  );

  const mainCanvas = drawBitmapToCanvas(bitmap, width, height);
  const blob = await canvasToBlob(mainCanvas, "image/webp", WEBP_QUALITY);

  const thumbSize = scaleToMaxLongestSide(
    sourceWidth,
    sourceHeight,
    BLURHASH_LONGEST_SIDE,
  );
  const thumbCanvas = drawBitmapToCanvas(
    bitmap,
    thumbSize.width,
    thumbSize.height,
  );
  const blurhash = computeBlurhashFromCanvas(thumbCanvas);

  bitmap.close();

  return { blob, width, height, blurhash };
}

export type { PreparedImage };
