import { normalizeOrderPrefix } from "./utils";

export function orderSequenceDate(date = new Date()) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

export function merchantOrderNumber(prefix: string | null | undefined, sequenceDate: string, sequence: number, fallbackName?: string | null) {
  return `${normalizeOrderPrefix(prefix, fallbackName ?? "SS")}-ORD-${sequenceDate}-${String(sequence).padStart(4, "0")}`;
}
