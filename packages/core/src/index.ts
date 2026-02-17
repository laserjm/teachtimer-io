export type ThemeMode = "light" | "dark" | "high-contrast";
export type SoundMode = "bell" | "chime" | "silent";

export interface Preset {
  id: string;
  name: string;
  durationSeconds: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  theme: ThemeMode;
  sound: SoundMode;
  volume: number;
  finalMinuteWarnings: boolean;
  autoFullscreenPrompt: boolean;
  extraLargeFont: boolean;
}

export type TimerWarningLevel = "normal" | "final-minute" | "final-ten" | "complete";

const defaultPresetDurations = [2, 5, 10, 15, 20];

export const DEFAULT_PRESETS: Preset[] = defaultPresetDurations.map((minutes, index) => {
  const now = new Date().toISOString();

  return {
    id: `preset-${minutes}`,
    name: `${minutes} min`,
    durationSeconds: minutes * 60,
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  };
});

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  sound: "chime",
  volume: 0.6,
  finalMinuteWarnings: true,
  autoFullscreenPrompt: false,
  extraLargeFont: false,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatTimer(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getWarningLevel(remainingSeconds: number, warningsEnabled: boolean): TimerWarningLevel {
  if (remainingSeconds <= 0) {
    return "complete";
  }

  if (!warningsEnabled) {
    return "normal";
  }

  if (remainingSeconds <= 10) {
    return "final-ten";
  }

  if (remainingSeconds <= 60) {
    return "final-minute";
  }

  return "normal";
}

export function remainingFromTarget(targetTimestampMs: number, nowMs = Date.now()): number {
  return Math.max(0, Math.ceil((targetTimestampMs - nowMs) / 1000));
}

export function progressPercent(durationSeconds: number, remainingSeconds: number): number {
  if (durationSeconds <= 0) {
    return 0;
  }

  const elapsed = durationSeconds - remainingSeconds;
  return clamp((elapsed / durationSeconds) * 100, 0, 100);
}
