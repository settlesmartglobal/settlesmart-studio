import type { ImageQualityChoice } from "../config";

export type GenerateImageInput = {
  prompt: string;
  width: number;
  height: number;
  quality: ImageQualityChoice;
  referenceImages?: string[];
  companyContext?: unknown;
  campaignContext?: unknown;
  productContext?: unknown;
};

export type GeneratedImageResult = {
  provider: "demo" | "openai";
  model: string;
  bytes: Buffer;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  providerRequestId?: string;
  metadata: Record<string, unknown>;
};

export interface StudioImageProvider {
  name: "demo" | "openai";
  generateImage(input: GenerateImageInput): Promise<GeneratedImageResult>;
}
