import type { StudioVideoProvider, VideoInput, VideoJobResult } from "./types";

export const disabledVideoProvider: StudioVideoProvider = {
  name: "disabled",
  async createVideo(input: VideoInput): Promise<VideoJobResult> {
    return {
      provider: "disabled",
      status: "FAILED",
      model: input.model,
      size: input.orientation,
      duration: input.duration,
      metadata: { message: "Video provider not configured." },
    };
  },
};
