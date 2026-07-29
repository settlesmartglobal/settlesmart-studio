import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const allowed = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["pdf", "application/pdf"],
  ["mp4", "video/mp4"],
  ["mov", "video/quicktime"],
  ["webm", "video/webm"],
]);

export async function storeUpload(file: File, folder: string) {
  const maxMb = Number(process.env.MAX_UPLOAD_MB ?? 25);
  if (file.size > maxMb * 1024 * 1024) throw new Error(`File exceeds ${maxMb}MB`);

  const originalFilename = path.basename(file.name);
  const ext = originalFilename.split(".").pop()?.toLowerCase() ?? "";
  const expectedMime = allowed.get(ext);
  if (!expectedMime || expectedMime !== file.type) throw new Error("Unsupported file type");

  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "").replace(/\.\./g, "");
  const uploadRoot = process.env.UPLOAD_DIR ?? "public/uploads";
  const storedFilename = `${randomUUID()}.${ext}`;
  const cwd = /* turbopackIgnore: true */ process.cwd();
  const absoluteDir = path.resolve(cwd, uploadRoot, safeFolder);
  const absolutePath = path.join(absoluteDir, storedFilename);
  const rootPath = path.resolve(cwd, uploadRoot);
  if (!absolutePath.startsWith(rootPath)) throw new Error("Invalid upload path");

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  const filePath = `/${path.relative(path.join(cwd, "public"), absolutePath).replaceAll(path.sep, "/")}`;
  return { originalFilename, storedFilename, filePath, mimeType: file.type, fileSize: file.size };
}
