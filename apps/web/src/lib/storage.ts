import { DEFAULT_PRESETS, DEFAULT_SETTINGS, type AppSettings, type Preset } from "@teachtimer/core";
import { z } from "zod";

const STORAGE_KEY = "teachtimer.local.v1";

const presetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  durationSeconds: z.number().int().min(10).max(4 * 60 * 60),
  sortOrder: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "high-contrast"]),
  sound: z.enum(["bell", "chime", "silent"]),
  volume: z.number().min(0).max(1),
  finalMinuteWarnings: z.boolean(),
  autoFullscreenPrompt: z.boolean(),
  extraLargeFont: z.boolean(),
});

const storageSchema = z.object({
  version: z.literal(1),
  presets: z.array(presetSchema).min(1),
  settings: settingsSchema,
});

export function loadLocalState(): { presets: Preset[]; settings: AppSettings } {
  if (typeof window === "undefined") {
    return { presets: DEFAULT_PRESETS, settings: DEFAULT_SETTINGS };
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return { presets: DEFAULT_PRESETS, settings: DEFAULT_SETTINGS };
  }

  try {
    const parsed = storageSchema.safeParse(JSON.parse(rawValue));
    if (!parsed.success) {
      return { presets: DEFAULT_PRESETS, settings: DEFAULT_SETTINGS };
    }

    return parsed.data;
  } catch {
    return { presets: DEFAULT_PRESETS, settings: DEFAULT_SETTINGS };
  }
}

export function saveLocalState(payload: { presets: Preset[]; settings: AppSettings }): void {
  if (typeof window === "undefined") {
    return;
  }

  const parsed = storageSchema.safeParse({
    version: 1,
    presets: payload.presets,
    settings: payload.settings,
  });

  if (!parsed.success) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.data));
}
