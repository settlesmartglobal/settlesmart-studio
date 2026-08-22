import { studioVideoConfig } from "../config";
import type { StudioVideoProvider, VideoInput, VideoJobResult } from "./types";

const sizeMap: Record<VideoInput["orientation"], string> = {
  portrait: "720x1280",
  landscape: "1280x720",
  square: "1024x1024",
};

export const openaiVideoProvider: StudioVideoProvider = {
  name: "openai",
  async createVideo(input: VideoInput): Promise<VideoJobResult> {
    const config = studioVideoConfig();
    if (!config.configured) {
      return { provider: "openai", status: "FAILED", model: input.model, size: sizeMap[input.orientation], duration: input.duration, metadata: { message: "OpenAI video generation is not configured." } };
    }
    const response = await fetch("https://api.openai.com/v1/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        seconds: input.duration,
        size: sizeMap[input.orientation],
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      return { provider: "openai", status: "FAILED", model: input.model, size: sizeMap[input.orientation], duration: input.duration, metadata: { error: json?.error ?? json } };
    }
    return {
      provider: "openai",
      providerJobId: String(json.id),
      status: "QUEUED",
      model: input.model,
      size: sizeMap[input.orientation],
      duration: input.duration,
      metadata: { video: json },
    };
  },
};
