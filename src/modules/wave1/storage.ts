import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const allowed = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["svg", "image/svg+xml"],
  ["webp", "image/webp"],
  ["ico", "image/x-icon"],
  ["pdf", "application/pdf"],
  ["mp4", "video/mp4"],
  ["mov", "video/quicktime"],
  ["webm", "video/webm"],
]);

export async function storeUpload(file: File, folder: string, options: { maxMb?: number; allowedMimeTypes?: string[] } = {}) {
  const maxMb = options.maxMb ?? Number(process.env.MAX_UPLOAD_MB ?? 25);
  if (file.size > maxMb * 1024 * 1024) throw new Error(`File exceeds ${maxMb}MB`);

  const originalFilename = path.basename(file.name);
  const ext = originalFilename.split(".").pop()?.toLowerCase() ?? "";
  const expectedMime = allowed.get(ext);
  if (!expectedMime || expectedMime !== file.type) throw new Error("Unsupported file type");
  if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.type)) throw new Error("Unsupported file type");

  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "").replace(/\.\./g, "");
  const uploadRoot = process.env.UPLOAD_DIR ?? "public/uploads";
  const storedFilename = `${randomUUID()}.${ext}`;
  const cwd = /*turbopackIgnore: true*/ process.cwd();
  const absoluteDir = path.resolve(cwd, uploadRoot, safeFolder);
  const absolutePath = path.join(absoluteDir, storedFilename);
  const rootPath = path.resolve(cwd, uploadRoot);
  if (!absolutePath.startsWith(rootPath)) throw new Error("Invalid upload path");

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  const filePath = `/${path.relative(path.join(cwd, "public"), absolutePath).replaceAll(path.sep, "/")}`;
  return { originalFilename, storedFilename, filePath, mimeType: file.type, fileSize: file.size };
}

export async function storeCommerceImage(file: File, companyId: string, productId: string) {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  const originalFilename = path.basename(file.name);
  const ext = originalFilename.split(".").pop()?.toLowerCase() ?? "";
  if (!["jpg", "jpeg", "png", "webp"].includes(ext) || !allowedMimeTypes.includes(file.type)) throw new Error("Unsupported file type");
  if (file.size > 8 * 1024 * 1024) throw new Error("File exceeds 8MB");

  const input = Buffer.from(await file.arrayBuffer());
  const transformer = sharp(input, { failOn: "warning" }).rotate();
  const metadata = await transformer.metadata();
  const output = await sharp(input, { failOn: "warning" }).rotate().resize({ width: 1200, height: 900, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const uploadRoot = process.env.UPLOAD_DIR ?? "public/uploads";
  const cwd = /*turbopackIgnore: true*/ process.cwd();
  const safeCompany = companyId.replace(/[^a-z0-9_-]/gi, "");
  const safeProduct = productId.replace(/[^a-z0-9_-]/gi, "");
  const absoluteDir = path.resolve(cwd, uploadRoot, safeCompany, "commerce-products", safeProduct);
  const rootPath = path.resolve(cwd, uploadRoot);
  const storedFilename = `${randomUUID()}.webp`;
  const absolutePath = path.join(absoluteDir, storedFilename);
  if (!absolutePath.startsWith(rootPath)) throw new Error("Invalid upload path");

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, output);

  const filePath = `/${path.relative(path.join(cwd, "public"), absolutePath).replaceAll(path.sep, "/")}`;
  return { originalFilename, storedFilename, filePath, mimeType: "image/webp", fileSize: output.length, width: metadata.width, height: metadata.height };
}
