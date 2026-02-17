"use client";

import {
  DEFAULT_PRESETS,
  DEFAULT_SETTINGS,
  clamp,
  formatTimer,
  getWarningLevel,
  progressPercent,
  remainingFromTarget,
  type AppSettings,
  type Preset,
} from "@teachtimer/core";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { playCompletionSound, unlockAudioContext } from "@/lib/audio";
import { loadLocalState, saveLocalState } from "@/lib/storage";

const MIN_SECONDS = 10;
const MAX_SECONDS = 4 * 60 * 60;
const QUICK_ADJUST_SECONDS = 60;

type AdjustSide = "minus" | "plus";

const ADJUST_MENU_STEPS = [
  1,
  10,
  30,
  60,
  5 * 60,
  10 * 60,
  20 * 60,
  30 * 60,
] as const;

type ThemeOption = AppSettings["theme"];

function formatAdjustStep(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  return `${seconds / 60}m`;
}

function formatSignedAdjustLabel(side: AdjustSide, seconds: number): string {
  return `${side === "plus" ? "+" : "-"}${formatAdjustStep(seconds)}`;
}

function parseEditableTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split(":").map((part) => Number(part));
  if (
    parts.some(
      (part) => Number.isNaN(part) || part < 0 || !Number.isFinite(part),
    )
  ) {
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
      <circle
        cx="200"
        cy="200"
        r={radius}
        className="timer-ring-track"
        strokeWidth="14"
      />
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
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
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
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {silent ? (
        <path d="m16 9 5 6M21 9l-5 6" />
      ) : (
        <path d="M16 9a5 5 0 0 1 0 6" />
      )}
    </svg>
  );
}

function IconSettings() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1v.1Z" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function TimerApp() {
  const [presets, setPresets] = useState<Preset[]>(DEFAULT_PRESETS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [durationSeconds, setDurationSeconds] = useState(300);
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [targetTimestampMs, setTargetTimestampMs] = useState<number | null>(
    null,
  );
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
  const warningLevel = useMemo(
    () => getWarningLevel(remainingSeconds, settings.finalMinuteWarnings),
    [remainingSeconds, settings.finalMinuteWarnings],
  );

  const timerLabel = useMemo(
    () => formatTimer(remainingSeconds),
    [remainingSeconds],
  );

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      const { presets: storedPresets, settings: storedSettings } =
        loadLocalState();
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
    const unlock = () => {
      void unlockAudioContext();
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

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

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

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
    void unlockAudioContext();
    const startFrom = remainingSeconds > 0 ? remainingSeconds : durationSeconds;

    setRemainingSeconds(startFrom);
    setTargetTimestampMs(Date.now() + startFrom * 1000);
    setIsRunning(true);
    setJustCompleted(false);
  }, [durationSeconds, remainingSeconds]);

  const pauseTimer = useCallback(() => {
    void unlockAudioContext();
    if (!isRunning || targetTimestampMs === null) {
      return;
    }

    setRemainingSeconds(remainingFromTarget(targetTimestampMs));
    setTargetTimestampMs(null);
    setIsRunning(false);
  }, [isRunning, targetTimestampMs]);

  const resetTimer = useCallback(() => {
    void unlockAudioContext();
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
    void unlockAudioContext();
    setSettings((prev) => ({
      ...prev,
      sound: prev.sound === "silent" ? "chime" : "silent",
    }));
  }, []);

  const addTime = useCallback(
    (seconds: number) => {
      void unlockAudioContext();
      setJustCompleted(false);

      setDurationSeconds((prev) =>
        clamp(prev + seconds, MIN_SECONDS, MAX_SECONDS),
      );
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
    ? "!text-[clamp(5rem,18vw,14rem)]"
    : "!text-[clamp(4rem,11vw,6.8rem)]";

  return (
    <main className="min-h-screen bg-[var(--bg)] p-3 md:p-4">
      <section
        className={`timer-shell timer-warning-${warningLevel} mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1320px] flex-col rounded-[24px] border border-[var(--glass-border)] border-t-[var(--glass-highlight)] bg-[var(--surface)]/90 px-4 py-4 text-[var(--text)] shadow-[0_2px_8px_var(--shadow-color),0_16px_48px_var(--shadow-heavy)] backdrop-blur-[24px] backdrop-saturate-[160%] md:px-5`}
      >
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm md:text-[2rem]">
            <span className="glass inline-flex items-center rounded-full px-5 py-2 text-base font-semibold text-[var(--text)] md:text-[2rem]">
              Timer
            </span>
            <span className="inline-flex items-center rounded-full border border-transparent px-3 py-2 text-base font-semibold text-[var(--muted)] md:text-[2rem]">
              Stopwatch
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              aria-label={
                settings.sound === "silent" ? "Enable sound" : "Mute sound"
              }
              onClick={toggleSoundMode}
              className="timer-icon-btn"
              size="icon-sm"
              variant="ghost"
            >
              <IconVolume silent={settings.sound === "silent"} />
            </Button>
            <Button
              aria-label="Open settings"
              onClick={() => setIsSettingsOpen(true)}
              className="timer-icon-btn"
              size="icon-sm"
              variant="ghost"
            >
              <IconSettings />
            </Button>
            <Button
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={toggleFullscreen}
              className="timer-icon-btn"
              size="icon-sm"
              variant="ghost"
            >
              <IconFullscreen active={isFullscreen} />
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-7 py-3 md:py-6">
          <div className={`relative ${ringSizeClass}`}>
            <CircleProgress progress={progress} />
            <div className="absolute inset-0 grid place-items-center px-4">
              {isEditingTime ? (
                <Input
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
                  className={`h-auto w-full max-w-[12ch] rounded-none border-x-0 border-t-0 border-b border-[var(--border)] bg-transparent px-0 text-center font-semibold tracking-tight tabular-nums text-[var(--text)] shadow-none focus-visible:border-[var(--border-strong)] focus-visible:ring-0 ${timerSizeClass}`}
                />
              ) : (
                <Button
                  onClick={beginTimeEdit}
                  className={`h-auto rounded-none border-x-0 border-t-0 border-b border-[var(--border)] bg-transparent px-2 font-semibold tracking-tight tabular-nums text-[var(--text)] shadow-none transition hover:border-[var(--border-strong)] hover:bg-transparent ${timerSizeClass}`}
                  variant="ghost"
                >
                  {timerLabel}
                </Button>
              )}
            </div>
          </div>

          <div className="timer-adjust-row">
            <div className="timer-adjust-group">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Open subtract time menu"
                    className="timer-adjust-arrow-btn timer-adjust-arrow-left"
                    variant="ghost"
                    size="icon-sm"
                  >
                    <IconChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="timer-adjust-menu"
                >
                  {ADJUST_MENU_STEPS.map((seconds) => (
                    <DropdownMenuItem
                      key={`minus-${seconds}`}
                      onSelect={() => addTime(-seconds)}
                      className="timer-adjust-menu-item"
                    >
                      {formatSignedAdjustLabel("minus", seconds)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                aria-label="Subtract one minute"
                onClick={() => addTime(-QUICK_ADJUST_SECONDS)}
                className="timer-adjust-quick-btn"
                variant="ghost"
              >
                -1m
              </Button>
            </div>

            <div className="timer-adjust-group">
              <Button
                aria-label="Add one minute"
                onClick={() => addTime(QUICK_ADJUST_SECONDS)}
                className="timer-adjust-quick-btn"
                variant="ghost"
              >
                +1m
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Open add time menu"
                    className="timer-adjust-arrow-btn timer-adjust-arrow-right"
                    variant="ghost"
                    size="icon-sm"
                  >
                    <IconChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="timer-adjust-menu"
                >
                  {ADJUST_MENU_STEPS.map((seconds) => (
                    <DropdownMenuItem
                      key={`plus-${seconds}`}
                      onSelect={() => addTime(seconds)}
                      className="timer-adjust-menu-item"
                    >
                      {formatSignedAdjustLabel("plus", seconds)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <footer className="space-y-3 pb-1">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={isRunning ? pauseTimer : startTimer}
              className="timer-action-btn timer-action-primary"
            >
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button
              onClick={resetTimer}
              className="timer-action-btn timer-action-secondary"
              variant="secondary"
            >
              Reset
            </Button>
          </div>

          {justCompleted ? (
            <p
              className="rounded-2xl border px-4 py-2 text-center text-sm"
              style={{
                borderColor: `color-mix(in srgb, var(--success) 35%, transparent)`,
                backgroundColor: `color-mix(in srgb, var(--success) 8%, transparent)`,
                color: "var(--success)",
              }}
            >
              Time is up.
            </p>
          ) : null}
        </footer>
      </section>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent
          aria-label="Timer settings"
          showCloseButton={false}
          className="glass-heavy max-w-2xl rounded-3xl p-5 text-[var(--text)] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]"
        >
          <DialogHeader className="flex-row items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-[var(--text)]">
              Settings
            </DialogTitle>
            <DialogClose asChild>
              <Button
                className="rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--muted)] hover:text-[var(--text)]"
                variant="ghost"
              >
                Close
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1 text-sm">
              <Label className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Theme
              </Label>
              <Select
                value={settings.theme}
                onValueChange={(value: string) =>
                  updateSetting("theme", value as ThemeOption)
                }
              >
                <SelectTrigger className="w-full rounded-xl border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent className="border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]">
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="high-contrast">High contrast</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1 text-sm">
              <Label className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Sound
              </Label>
              <Select
                value={settings.sound}
                onValueChange={(value: string) =>
                  updateSetting("sound", value as AppSettings["sound"])
                }
              >
                <SelectTrigger className="w-full rounded-xl border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
                  <SelectValue placeholder="Select sound" />
                </SelectTrigger>
                <SelectContent className="border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]">
                  <SelectItem value="chime">Chime</SelectItem>
                  <SelectItem value="bell">Bell</SelectItem>
                  <SelectItem value="silent">Silent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 text-sm">
              <Label className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Volume
              </Label>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[settings.volume]}
                onValueChange={([value]: number[]) =>
                  updateSetting("volume", value ?? 0)
                }
                disabled={settings.sound === "silent"}
                aria-label="Volume"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm">
              <Label className="text-sm font-medium">
                Final-minute warning
              </Label>
              <Checkbox
                checked={settings.finalMinuteWarnings}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  updateSetting("finalMinuteWarnings", checked === true)
                }
              />
            </div>
          </div>

          <div className="mt-2">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Quick durations
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="rounded-full border border-[var(--border)] bg-[var(--accent-muted)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)] hover:bg-[var(--accent-light)]"
                  variant="outline"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
