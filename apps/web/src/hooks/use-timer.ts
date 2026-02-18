"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_PRESETS,
  clamp,
  formatTimer,
  getWarningLevel,
  progressPercent,
  remainingFromTarget,
  type Preset,
  type TimerWarningLevel,
} from "@teachtimer/core";

import { playCompletionSound, unlockAudioContext } from "@/lib/audio";

export interface UseTimerReturn {
  presets: Preset[];
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  progress: number;
  warningLevel: TimerWarningLevel;
  timerLabel: string;
  start: () => void;
  pause: () => void;
  reset: () => void;
  toggle: () => void;
  selectPreset: (preset: Preset) => void;
  setDuration: (seconds: number) => void;
  addTime: (seconds: number) => void;
  justCompleted: boolean;
}

export function useTimer(initialDuration = 300): UseTimerReturn {
  const [presets] = useState<Preset[]>(DEFAULT_PRESETS);
  const [durationSeconds, setDurationSeconds] = useState(initialDuration);
  const [remainingSeconds, setRemainingSeconds] = useState(initialDuration);
  const [targetTimestampMs, setTargetTimestampMs] = useState<number | null>(
    null,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const completedRef = useRef(false);

  const progress = useMemo(
    () => progressPercent(durationSeconds, remainingSeconds),
    [durationSeconds, remainingSeconds],
  );

  const warningLevel = useMemo(
    () => getWarningLevel(remainingSeconds, true),
    [remainingSeconds],
  );

  const timerLabel = useMemo(
    () => formatTimer(remainingSeconds),
    [remainingSeconds],
  );

  // Unlock audio context on first user interaction
  useEffect(() => {
    const unlock = () => void unlockAudioContext();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Tick loop
  useEffect(() => {
    if (!isRunning || targetTimestampMs === null) return;

    const tick = () => {
      const remaining = remainingFromTarget(targetTimestampMs);
      setRemainingSeconds(remaining);
      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        setIsRunning(false);
        setTargetTimestampMs(null);
        setJustCompleted(true);
        void playCompletionSound("chime", 0.6);
      }
    };

    const id = setInterval(tick, 100);
    tick();
    return () => clearInterval(id);
  }, [isRunning, targetTimestampMs]);

  const start = useCallback(() => {
    if (remainingSeconds <= 0) return;
    completedRef.current = false;
    setJustCompleted(false);
    setTargetTimestampMs(Date.now() + remainingSeconds * 1000);
    setIsRunning(true);
  }, [remainingSeconds]);

  const pause = useCallback(() => {
    setIsRunning(false);
    setTargetTimestampMs(null);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTargetTimestampMs(null);
    setRemainingSeconds(durationSeconds);
    setJustCompleted(false);
    completedRef.current = false;
  }, [durationSeconds]);

  const toggle = useCallback(() => {
    if (isRunning) pause();
    else start();
  }, [isRunning, pause, start]);

  const selectPreset = useCallback((preset: Preset) => {
    setIsRunning(false);
    setTargetTimestampMs(null);
    setDurationSeconds(preset.durationSeconds);
    setRemainingSeconds(preset.durationSeconds);
    setJustCompleted(false);
    completedRef.current = false;
  }, []);

  const setDuration = useCallback((seconds: number) => {
    const clamped = clamp(seconds, 10, 4 * 3600);
    setIsRunning(false);
    setTargetTimestampMs(null);
    setDurationSeconds(clamped);
    setRemainingSeconds(clamped);
    setJustCompleted(false);
    completedRef.current = false;
  }, []);

  const addTime = useCallback(
    (seconds: number) => {
      void unlockAudioContext();
      setJustCompleted(false);
      completedRef.current = false;

      setDurationSeconds((prev) => clamp(prev + seconds, 10, 4 * 3600));
      setRemainingSeconds((prev) => clamp(prev + seconds, 0, 4 * 3600));

      if (isRunning) {
        setTargetTimestampMs((prev) => (prev ?? Date.now()) + seconds * 1000);
      }
    },
    [isRunning],
  );

  return {
    presets,
    durationSeconds,
    remainingSeconds,
    isRunning,
    progress,
    warningLevel,
    timerLabel,
    start,
    pause,
    reset,
    toggle,
    selectPreset,
    setDuration,
    addTime,
    justCompleted,
  };
}
