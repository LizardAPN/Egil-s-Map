"use client";

import { decode } from "blurhash";
import { useEffect, useRef, useState } from "react";

import { cn } from "@imprint/ui";

export interface BlurImageProps {
  blurhash: string | null;
  src: string;
  width: number | null;
  height: number | null;
  alt?: string;
  className?: string;
}

export function BlurImage({
  blurhash,
  src,
  width,
  height,
  alt = "",
  className,
}: BlurImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    if (!blurhash || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const aspect = width && height && height > 0 ? width / height : 1;
    const canvasWidth = 32;
    const canvasHeight = Math.max(1, Math.round(canvasWidth / aspect));

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const pixels = decode(blurhash, canvasWidth, canvasHeight);
    const imageData = new ImageData(
      new Uint8ClampedArray(pixels),
      canvasWidth,
      canvasHeight,
    );
    context.putImageData(imageData, 0, 0);
  }, [blurhash, width, height]);

  const showImage = loaded || reduceMotion;

  return (
    <span className={cn("relative block overflow-hidden", className)}>
      {blurhash ? (
        <canvas
          ref={canvasRef}
          aria-hidden
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
            showImage ? "opacity-0" : "opacity-100",
          )}
        />
      ) : null}
      <img
        src={src}
        alt={alt}
        onLoad={() => {
          setLoaded(true);
        }}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-200",
          showImage ? "opacity-100" : "opacity-0",
        )}
      />
    </span>
  );
}
