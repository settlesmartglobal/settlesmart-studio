export type VideoInput = {
  prompt: string;
  model: string;
  duration: "4" | "8" | "12";
  orientation: "portrait" | "square" | "landscape";
  quality: "standard" | "premium";
  inputReference?: string;
  campaignContext?: unknown;
  storyboard?: unknown;
};

export type VideoJobResult = {
  provider: "disabled" | "openai";
  providerJobId?: string;
  status: "QUEUED" | "PROCESSING" | "FAILED";
  model: string;
  size: string;
  duration: string;
  metadata: Record<string, unknown>;
};

export interface StudioVideoProvider {
  name: "disabled" | "openai";
  createVideo(input: VideoInput): Promise<VideoJobResult>;
}
