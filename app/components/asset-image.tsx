"use client";

import { useState } from "react";
import { commercePlaceholderPath, normalizePublicAssetPath } from "@/modules/wave1/assets";

export function AssetImage({
  src,
  alt,
  className,
  fallback = commercePlaceholderPath,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: string;
}) {
  const normalizedFallback = normalizePublicAssetPath(fallback, commercePlaceholderPath);
  const normalizedSrc = normalizePublicAssetPath(src, normalizedFallback);
  const [failedSrc, setFailedSrc] = useState("");
  const currentSrc = failedSrc === normalizedSrc ? normalizedFallback : normalizedSrc;

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className ?? "aspect-video w-full rounded-md object-cover"}
      onError={() => {
        if (currentSrc !== normalizedFallback) setFailedSrc(normalizedSrc);
      }}
    />
  );
}
