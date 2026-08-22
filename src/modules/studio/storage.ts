import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function writeGeneratedBuffer(companyId: string, folder: string, filename: string, bytes: Buffer | Uint8Array) {
  const uploadRoot = process.env.UPLOAD_DIR ?? "public/uploads";
  const cwd = /* turbopackIgnore: true */ process.cwd();
  const absoluteDir = path.resolve(cwd, uploadRoot, companyId, folder);
  await mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(absoluteDir, filename);
  await writeFile(absolutePath, bytes);
  const filePath = `/${path.relative(path.join(cwd, "public"), absolutePath).replaceAll(path.sep, "/")}`;
  return {
    absolutePath,
    filePath,
    storedFilename: filename,
    fileSize: Buffer.byteLength(bytes),
    checksum: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function publicAssetUrl(filePath: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (/^https:\/\//i.test(filePath)) return filePath;
  return `${appUrl.replace(/\/$/, "")}/${filePath.replace(/^\//, "")}`;
}

export function isPublicHttpsUrl(value: string) {
  return /^https:\/\//i.test(value) && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value);
}
