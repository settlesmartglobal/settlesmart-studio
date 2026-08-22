import OpenAI from "openai";
import { imageQualityMap, studioImageConfig } from "../config";
import type { GenerateImageInput, GeneratedImageResult, StudioImageProvider } from "./types";

function imageSize(width: number, height: number) {
  const fit = (value: number) => Math.max(16, Math.round(value / 16) * 16);
  return `${fit(width)}x${fit(height)}`;
}

export function openaiImageRequest(input: GenerateImageInput, config: ReturnType<typeof studioImageConfig>) {
  return {
    model: config.model,
    prompt: input.prompt,
    size: imageSize(input.width, input.height),
    quality: imageQualityMap[input.quality] ?? config.quality,
    output_format: "png" as const,
  };
}

export function decodeOpenAIImageData(image: { b64_json?: string } | undefined) {
  if (!image?.b64_json) throw new Error("OpenAI image generation returned no image.");
  return Buffer.from(image.b64_json, "base64");
}

export const openaiImageProvider: StudioImageProvider = {
  name: "openai",
  async generateImage(input: GenerateImageInput): Promise<GeneratedImageResult> {
    const config = studioImageConfig();
    if (!config.configured) throw new Error("OpenAI image generation is not configured.");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.images.generate(openaiImageRequest(input, config));
    const first = response.data?.[0] as { b64_json?: string; revised_prompt?: string } | undefined;
    return {
      provider: "openai",
      model: config.model,
      bytes: decodeOpenAIImageData(first),
      mimeType: "image/png",
      width: input.width,
      height: input.height,
      providerRequestId: response._request_id ?? undefined,
      metadata: { prompt: input.prompt, revisedPrompt: first?.revised_prompt, quality: input.quality },
    };
  },
};
