import sharp from "sharp";
import type { GenerateImageInput, GeneratedImageResult, StudioImageProvider } from "./types";

export const demoImageProvider: StudioImageProvider = {
  name: "demo",
  async generateImage(input: GenerateImageInput): Promise<GeneratedImageResult> {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}">
      <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#0f172a"/><stop offset="1" stop-color="#14b8a6"/></linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="7%" y="16%" fill="#fff" font-family="Arial" font-size="34" font-weight="700">Studio demo visual</text>
      <text x="7%" y="23%" fill="#dbeafe" font-family="Arial" font-size="22">${input.quality} quality template background</text>
    </svg>`;
    const bytes = await sharp(Buffer.from(svg)).png().toBuffer();
    return {
      provider: "demo",
      model: "deterministic-template",
      bytes,
      mimeType: "image/png",
      width: input.width,
      height: input.height,
      metadata: { prompt: input.prompt, mode: "demo" },
    };
  },
};
