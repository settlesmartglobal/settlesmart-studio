import { studioImageConfig } from "../config";
import { demoImageProvider } from "./demo-provider";
import { openaiImageProvider } from "./openai-provider";

export function imageProvider() {
  const config = studioImageConfig();
  if (config.mode === "openai") return openaiImageProvider;
  return demoImageProvider;
}
