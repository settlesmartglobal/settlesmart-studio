export type ImageQualityChoice = "fast" | "balanced" | "premium";

export const imageQualityMap: Record<ImageQualityChoice, "low" | "medium" | "high"> = {
  fast: "low",
  balanced: "medium",
  premium: "high",
};

export const imagePlatformSizes: Record<string, { width: number; height: number; label: string }> = {
  INSTAGRAM_SQUARE: { width: 1080, height: 1080, label: "Instagram Square" },
  INSTAGRAM: { width: 1080, height: 1350, label: "Instagram Portrait" },
  INSTAGRAM_STORY: { width: 1080, height: 1920, label: "Instagram Story" },
  FACEBOOK: { width: 1200, height: 630, label: "Facebook Post" },
  LINKEDIN: { width: 1200, height: 627, label: "LinkedIn Post" },
  WHATSAPP: { width: 1080, height: 1080, label: "WhatsApp Creative" },
  SQUARE: { width: 1080, height: 1080, label: "Square" },
  BANNER: { width: 1600, height: 600, label: "Banner" },
};

export function studioImageConfig() {
  return {
    mode: process.env.STUDIO_IMAGE_MODE ?? "demo",
    model: process.env.STUDIO_IMAGE_MODEL ?? "gpt-image-2",
    quality: process.env.STUDIO_IMAGE_QUALITY ?? "medium",
    configured: Boolean(process.env.OPENAI_API_KEY),
  };
}

export function studioVideoConfig() {
  return {
    mode: process.env.STUDIO_VIDEO_MODE ?? "disabled",
    model: process.env.STUDIO_VIDEO_MODEL ?? "sora-2",
    premiumModel: process.env.STUDIO_VIDEO_PREMIUM_MODEL ?? "sora-2-pro",
    configured: Boolean(process.env.OPENAI_API_KEY),
  };
}

export function metaConfig() {
  return {
    appId: process.env.META_APP_ID ?? "",
    appSecret: process.env.META_APP_SECRET ?? "",
    redirectUri: process.env.META_REDIRECT_URI ?? "",
    graphApiVersion: process.env.META_GRAPH_API_VERSION ?? "v21.0",
    configured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_REDIRECT_URI),
  };
}
