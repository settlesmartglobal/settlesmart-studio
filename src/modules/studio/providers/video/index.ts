import { studioVideoConfig } from "../config";
import { disabledVideoProvider } from "./disabled-provider";
import { openaiVideoProvider } from "./openai-provider";

export function videoProvider() {
  const config = studioVideoConfig();
  if (config.mode === "openai") return openaiVideoProvider;
  return disabledVideoProvider;
}
