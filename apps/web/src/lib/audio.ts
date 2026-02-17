import { clamp, type SoundMode } from "@teachtimer/core";

function scheduleTone(
  audioContext: AudioContext,
  startTime: number,
  duration: number,
  frequency: number,
  volume: number,
): void {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(clamp(volume, 0, 1), startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

export async function playCompletionSound(mode: SoundMode, volume: number): Promise<void> {
  if (mode === "silent") {
    return;
  }

  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const context = new AudioCtx();
  const start = context.currentTime;

  if (mode === "bell") {
    scheduleTone(context, start, 0.18, 880, volume * 0.9);
    scheduleTone(context, start + 0.2, 0.3, 1320, volume);
  } else {
    scheduleTone(context, start, 0.22, 740, volume * 0.9);
    scheduleTone(context, start + 0.24, 0.22, 988, volume * 0.95);
  }

  window.setTimeout(() => {
    void context.close();
  }, 1200);
}
