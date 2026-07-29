export const commercePlaceholderPath = "/uploads/commerce-placeholder.svg";

export function normalizePublicAssetPath(value?: string | null, fallback = commercePlaceholderPath) {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  const withoutOrigin = trimmed.replace(/^file:\/\//i, "");
  const normalized = withoutOrigin.replace(/\\/g, "/").replace(/^\/+/, "");
  const publicIndex = normalized.indexOf("public/");
  const publicPath = publicIndex >= 0 ? normalized.slice(publicIndex + "public/".length) : normalized;
  if (publicPath.startsWith("uploads/")) return `/${publicPath}`;
  return `/${publicPath.replace(/^\/+/, "")}`;
}
