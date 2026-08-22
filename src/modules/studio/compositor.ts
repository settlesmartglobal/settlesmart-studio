import sharp from "sharp";
import type { AwaitedReturn } from "@/types/utility";
import { getBusinessContext } from "./intelligence";

type BusinessContext = AwaitedReturn<typeof getBusinessContext>;

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] ?? char));
}

function textLines(value: string, max = 34) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > max) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

export async function composeBrandedPoster(input: {
  background: Buffer;
  width: number;
  height: number;
  context: BusinessContext;
  headline: string;
  subheadline?: string | null;
  cta?: string | null;
}) {
  const bandHeight = Math.max(180, Math.round(input.height * 0.26));
  const headlineLines = textLines(input.headline, input.width > input.height ? 42 : 28);
  const subLines = textLines(input.subheadline ?? input.context.brand.tagline ?? "", input.width > input.height ? 60 : 38);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}">
    <rect y="${input.height - bandHeight}" width="${input.width}" height="${bandHeight}" fill="${input.context.brand.backgroundColor}" opacity=".94"/>
    <rect x="0" y="${input.height - bandHeight}" width="18" height="${bandHeight}" fill="${input.context.brand.accentColor}"/>
    <text x="52" y="${input.height - bandHeight + 54}" fill="${input.context.brand.primaryColor}" font-family="Arial" font-size="28" font-weight="700">${escapeXml(input.context.name)}</text>
    ${headlineLines.map((line, index) => `<text x="52" y="${input.height - bandHeight + 112 + index * 52}" fill="#111827" font-family="Arial" font-size="42" font-weight="800">${escapeXml(line)}</text>`).join("")}
    ${subLines.map((line, index) => `<text x="52" y="${input.height - 78 + index * 30}" fill="#334155" font-family="Arial" font-size="24">${escapeXml(line)}</text>`).join("")}
    <rect x="${input.width - 360}" y="${input.height - 118}" rx="16" width="300" height="64" fill="${input.context.brand.accentColor}"/>
    <text x="${input.width - 330}" y="${input.height - 77}" fill="#fff" font-family="Arial" font-size="24" font-weight="700">${escapeXml(input.cta ?? input.context.brand.defaultCta)}</text>
  </svg>`;
  return sharp(input.background)
    .resize(input.width, input.height, { fit: "cover" })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
