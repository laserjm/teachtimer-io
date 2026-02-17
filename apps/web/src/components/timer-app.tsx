"use client";

import {
  DEFAULT_PRESETS,
  DEFAULT_SETTINGS,
  clamp,
  formatTimer,
  progressPercent,
  remainingFromTarget,
  type AppSettings,
  type Preset,
} from "@teachtimer/core";
import { useCallback, useEffect, useMemo, useState } from "react";

import { playCompletionSound } from "@/lib/audio";
import { loadLocalState, saveLocalState } from "@/lib/storage";

const MIN_SECONDS = 10;
const MAX_SECONDS = 4 * 60 * 60;

type ThemeOption = AppSettings["theme"];

type AddTimeButton = {
  label: string;
  seconds: number;
};

const ADD_TIME_BUTTONS: AddTimeButton[] = [
  { label: "+0:30", seconds: 30 },
  { label: "+1:00", seconds: 60 },
  { label: "+5:00", seconds: 5 * 60 },
];

function parseEditableTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part) || part < 0 || !Number.isFinite(part))) {
    return null;
  }

  let totalSeconds = 0;

  if (parts.length === 1) {
    totalSeconds = parts[0] * 60;
  } else if (parts.length === 2) {
    totalSeconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else {
    return null;
  }

  return clamp(Math.round(totalSeconds), MIN_SECONDS, MAX_SECONDS);
}

function CircleProgress({ progress }: { progress: number }) {
  const radius = 170;
  const circumference = 2 * Math.PI * radius;
  const normalizedProgress = clamp(progress, 0, 100);
  const offset = circumference * (1 - normalizedProgress / 100);

  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="200" cy="200" r={radius} className="timer-ring-track" strokeWidth="14" />
      <circle
        cx="200"
        cy="200"
        r={radius}
        className="timer-ring-progress"
        strokeWidth="14"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 200 200)"
      />
    </svg>
  );
}

function IconFullscreen({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {active ? (
        <>
          <path d="M8 3H3v5" />
          <path d="M16 3h5v5" />
          <path d="M21 16v5h-5" />
          <path d="M3 16v5h5" />
        </>
      ) : (
        <>
          <path d="M15 3h6v6" />
          <path d="M9 21H3v-6" />
          <path d="M21 9V3h-6" />
          <path d="M3 15v6h6" />
        </>
      )}
    </svg>
  );
}

function IconVolume({ silent }: { silent: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {silent ? <path d="m16 9 5 6M21 9l-5 6" /> : <path d="M16 9a5 5 0 0 1 0 6" />}
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1v.1Z" />
    </svg>
  );
}

export default function TimerApp() {
  const [presets, setPresets] = useState<Preset[]>(DEFAULT_PRESETS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [durationSeconds, setDurationSeconds] = useState(300);
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [targetTimestampMs, setTargetTimestampMs] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const [isEditingTime, setIsEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState("5:00");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const progress = useMemo(
    () => progressPercent(durationSeconds, remainingSeconds),
    [durationSeconds, remainingSeconds],
  );

  const timerLabel = useMemo(() => formatTimer(remainingSeconds), [remainingSeconds]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      const { presets: storedPresets, settings: storedSettings } = loadLocalState();
      const initialPreset = storedPresets[0] ?? DEFAULT_PRESETS[0];

      setPresets(storedPresets);
      setSettings(storedSettings);
      setDurationSeconds(initialPreset.durationSeconds);
      setRemainingSeconds(initialPreset.durationSeconds);
      setTimeInput(formatTimer(initialPreset.durationSeconds));
      setLoaded(true);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    saveLocalState({ presets, settings });
  }, [loaded, presets, settings]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    onFullscreenChange();
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isRunning || targetTimestampMs === null) {
      return;
    }

    let completed = false;

    const syncRemaining = () => {
      const nextRemaining = remainingFromTarget(targetTimestampMs);
      setRemainingSeconds(nextRemaining);

      if (!completed && nextRemaining === 0) {
        completed = true;
        setIsRunning(false);
        setTargetTimestampMs(null);
        setJustCompleted(true);
        void playCompletionSound(settings.sound, settings.volume);
      }
    };

    syncRemaining();

    const intervalId = window.setInterval(syncRemaining, 250);
    document.addEventListener("visibilitychange", syncRemaining);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", syncRemaining);
    };
  }, [isRunning, settings.sound, settings.volume, targetTimestampMs]);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyDuration = useCallback((seconds: number) => {
    const clampedSeconds = clamp(seconds, MIN_SECONDS, MAX_SECONDS);

    setDurationSeconds(clampedSeconds);
    setRemainingSeconds(clampedSeconds);
    setIsRunning(false);
    setTargetTimestampMs(null);
    setJustCompleted(false);
    setIsEditingTime(false);
    setTimeInput(formatTimer(clampedSeconds));
  }, []);

  const applyPreset = useCallback(
    (preset: Preset) => {
      applyDuration(preset.durationSeconds);
    },
    [applyDuration],
  );

  const startTimer = useCallback(() => {
    const startFrom = remainingSeconds > 0 ? remainingSeconds : durationSeconds;

    setRemainingSeconds(startFrom);
    setTargetTimestampMs(Date.now() + startFrom * 1000);
    setIsRunning(true);
    setJustCompleted(false);
  }, [durationSeconds, remainingSeconds]);

  const pauseTimer = useCallback(() => {
    if (!isRunning || targetTimestampMs === null) {
      return;
    }

    setRemainingSeconds(remainingFromTarget(targetTimestampMs));
    setTargetTimestampMs(null);
    setIsRunning(false);
  }, [isRunning, targetTimestampMs]);

  const resetTimer = useCallback(() => {
    setRemainingSeconds(durationSeconds);
    setTargetTimestampMs(null);
    setIsRunning(false);
    setJustCompleted(false);
    setIsEditingTime(false);
    setTimeInput(formatTimer(durationSeconds));
  }, [durationSeconds]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  }, []);

  const toggleSoundMode = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      sound: prev.sound === "silent" ? "chime" : "silent",
    }));
  }, []);

  const addTime = useCallback(
    (seconds: number) => {
      setJustCompleted(false);

      setDurationSeconds((prev) => clamp(prev + seconds, MIN_SECONDS, MAX_SECONDS));
      setRemainingSeconds((prev) => clamp(prev + seconds, 0, MAX_SECONDS));

      if (isRunning) {
        setTargetTimestampMs((prev) => (prev ?? Date.now()) + seconds * 1000);
      }
    },
    [isRunning],
  );

  const beginTimeEdit = useCallback(() => {
    setTimeInput(timerLabel);
    setIsEditingTime(true);
  }, [timerLabel]);

  const commitTimeEdit = useCallback(() => {
    const parsedSeconds = parseEditableTime(timeInput);

    if (parsedSeconds === null) {
      setTimeInput(timerLabel);
      setIsEditingTime(false);
      return;
    }

    applyDuration(parsedSeconds);
  }, [applyDuration, timeInput, timerLabel]);

  const cancelTimeEdit = useCallback(() => {
    setTimeInput(timerLabel);
    setIsEditingTime(false);
  }, [timerLabel]);

  const ringSizeClass = isFullscreen
    ? "h-[min(80vh,46rem)] w-[min(92vw,46rem)]"
    : "h-[min(62vh,30rem)] w-[min(92vw,30rem)]";

  const timerSizeClass = isFullscreen
    ? "text-[clamp(5rem,18vw,14rem)]"
    : "text-[clamp(4rem,11vw,6.8rem)]";

  return (
    <main className="min-h-screen bg-[var(--bg)] p-3 md:p-4">
      <section className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1320px] flex-col rounded-[24px] border border-white/10 bg-[var(--surface)] px-4 py-4 text-[var(--text)] shadow-[0_30px_80px_rgba(8,12,28,0.5)] md:px-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm md:text-[2rem]">
            <span className="inline-flex items-center rounded-full border border-transparent bg-[var(--tab-active)] px-5 py-2 text-base font-semibold text-[var(--text)] md:text-[2rem]">
              Timer
            </span>
            <span className="inline-flex items-center rounded-full border border-transparent px-3 py-2 text-base font-semibold text-[var(--muted)] md:text-[2rem]">
              Stopwatch
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={settings.sound === "silent" ? "Enable sound" : "Mute sound"}
              onClick={toggleSoundMode}
              className="timer-icon-btn"
            >
              <IconVolume silent={settings.sound === "silent"} />
            </button>
            <button
              type="button"
              aria-label="Open settings"
              onClick={() => setIsSettingsOpen(true)}
              className="timer-icon-btn"
            >
              <IconSettings />
            </button>
            <button
              type="button"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={toggleFullscreen}
              className="timer-icon-btn"
            >
              <IconFullscreen active={isFullscreen} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-7 py-3 md:py-6">
          <div className={`relative ${ringSizeClass}`}>
            <CircleProgress progress={progress} />
            <div className="absolute inset-0 grid place-items-center px-4">
              {isEditingTime ? (
                <input
                  autoFocus
                  value={timeInput}
                  onChange={(event) => setTimeInput(event.target.value)}
                  onBlur={commitTimeEdit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitTimeEdit();
                    }

                    if (event.key === "Escape") {
                      cancelTimeEdit();
                    }
                  }}
                  aria-label="Edit timer"
                  className={`w-full max-w-[12ch] border-b border-white/20 bg-transparent text-center font-semibold tracking-tight text-[var(--text)] outline-none ${timerSizeClass}`}
                />
              ) : (
                <button
                  type="button"
                  onClick={beginTimeEdit}
                  className={`border-b border-white/20 px-2 font-semibold tracking-tight text-[var(--text)] transition hover:border-white/40 ${timerSizeClass}`}
                >
                  {timerLabel}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {ADD_TIME_BUTTONS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => addTime(item.seconds)}
                className="timer-add-btn"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <footer className="space-y-3 pb-1">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={isRunning ? pauseTimer : startTimer}
              className="timer-action-btn timer-action-primary"
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button type="button" onClick={resetTimer} className="timer-action-btn timer-action-secondary">
              Reset
            </button>
          </div>

          {justCompleted ? (
            <p className="rounded-2xl border border-emerald-300/35 bg-emerald-500/8 px-4 py-2 text-center text-sm text-emerald-200">
              Time is up.
            </p>
          ) : null}
        </footer>
      </section>

      {isSettingsOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Timer settings"
            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#30374f] p-5 text-[var(--text)] shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-full border border-white/15 px-3 py-1 text-sm text-[var(--muted)] hover:text-[var(--text)]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm" htmlFor="theme">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Theme</span>
                <select
                  id="theme"
                  value={settings.theme}
                  onChange={(event) => updateSetting("theme", event.target.value as ThemeOption)}
                  className="rounded-xl border border-white/15 bg-[#252d44] px-3 py-2"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="high-contrast">High contrast</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm" htmlFor="sound">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Sound</span>
                <select
                  id="sound"
                  value={settings.sound}
                  onChange={(event) => updateSetting("sound", event.target.value as AppSettings["sound"])}
                  className="rounded-xl border border-white/15 bg-[#252d44] px-3 py-2"
                >
                  <option value="chime">Chime</option>
                  <option value="bell">Bell</option>
                  <option value="silent">Silent</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm" htmlFor="volume">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Volume</span>
                <input
                  id="volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(event) => updateSetting("volume", Number(event.target.value))}
                  disabled={settings.sound === "silent"}
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-white/15 bg-[#252d44] px-3 py-2 text-sm">
                <span>Final-minute warning</span>
                <input
                  type="checkbox"
                  checked={settings.finalMinuteWarnings}
                  onChange={(event) => updateSetting("finalMinuteWarnings", event.target.checked)}
                />
              </label>
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Quick durations</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-full border border-white/20 bg-[#3a4360] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
