"use client";

import { useCallback, useEffect, useState } from "react";
import { useTimer } from "@/hooks/use-timer";
import { clamp, formatTimer } from "@teachtimer/core";

const MIN_SECONDS = 10;
const MAX_SECONDS = 4 * 60 * 60;
const QUICK_ADJUST = 60;
const ADJUST_STEPS = [1, 10, 30, 60, 300, 600, 1200, 1800] as const;

function fmtStep(s: number) {
  return s < 60 ? `${s}s` : `${s / 60}m`;
}

function fmtSigned(side: "minus" | "plus", s: number) {
  return `${side === "plus" ? "+" : "-"}${fmtStep(s)}`;
}

function parseEditableTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p) || p < 0 || !Number.isFinite(p))) {
    return null;
  }

  let total = 0;
  if (parts.length === 1) total = parts[0] * 60;
  else if (parts.length === 2) total = parts[0] * 60 + parts[1];
  else if (parts.length === 3) {
    total = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else {
    return null;
  }

  return clamp(Math.round(total), MIN_SECONDS, MAX_SECONDS);
}

export default function TimerBrutalist() {
  const {
    presets,
    durationSeconds,
    isRunning,
    warningLevel,
    timerLabel,
    toggle,
    reset,
    selectPreset,
    justCompleted,
    remainingSeconds,
    addTime,
    setDuration,
  } = useTimer();

  const [isEditing, setIsEditing] = useState(false);
  const [timeInput, setTimeInput] = useState("5:00");
  const [openMenu, setOpenMenu] = useState<"minus" | "plus" | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const beginEdit = useCallback(() => {
    setTimeInput(timerLabel);
    setIsEditing(true);
  }, [timerLabel]);

  const commitEdit = useCallback(() => {
    const parsed = parseEditableTime(timeInput);
    if (parsed === null) {
      setTimeInput(timerLabel);
      setIsEditing(false);
      return;
    }
    setDuration(parsed);
    setTimeInput(formatTimer(parsed));
    setIsEditing(false);
  }, [timeInput, timerLabel, setDuration]);

  const cancelEdit = useCallback(() => {
    setTimeInput(timerLabel);
    setIsEditing(false);
  }, [timerLabel]);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    onFullscreenChange();
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
    } catch {
      // Ignore fullscreen request failures (browser policies/user gesture constraints).
    }
  }, []);

  const accentColor =
    warningLevel === "final-ten" || warningLevel === "complete"
      ? "#FF0040"
      : warningLevel === "final-minute"
        ? "#FFB800"
        : "#00FF41";

  const elapsedSeconds = clamp(durationSeconds - remainingSeconds, 0, durationSeconds);
  const elapsedPercent =
    durationSeconds > 0
      ? clamp((elapsedSeconds / durationSeconds) * 100, 0, 100)
      : 0;
  const redSeconds = Math.min(10, durationSeconds);
  const yellowSeconds = Math.min(60, Math.max(durationSeconds - redSeconds, 0));
  const greenSeconds = Math.max(durationSeconds - yellowSeconds - redSeconds, 0);
  const greenPercent =
    durationSeconds > 0 ? (greenSeconds / durationSeconds) * 100 : 0;
  const yellowPercent =
    durationSeconds > 0 ? (yellowSeconds / durationSeconds) * 100 : 0;
  const redPercent = durationSeconds > 0 ? (redSeconds / durationSeconds) * 100 : 0;
  const pointerPercent = clamp(elapsedPercent, 0, 100);
  const pointerOffset =
    pointerPercent <= 0 ? "0%" : pointerPercent >= 100 ? "-100%" : "-50%";
  const progressBarHeight = "clamp(36px, 5.4vw, 48px)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        color: "#fff",
        fontFamily: "var(--font-mono), monospace",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.5rem 2rem",
          borderBottom: "1px solid #222",
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#666",
          }}
        >
          TEACHTIMER://COUNTDOWN
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              color: accentColor,
              fontWeight: 700,
            }}
          >
            {isRunning ? "▶ RUNNING" : justCompleted ? "■ DONE" : "◼ IDLE"}
          </span>
          <button
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            aria-pressed={isFullscreen}
            style={{
              minHeight: "44px",
              minWidth: "44px",
              padding: "0.65rem 0.95rem",
              background: isFullscreen ? "#1a1a1a" : "#111",
              border: "1px solid #333",
              color: "#ddd",
              fontFamily: "inherit",
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              lineHeight: 1.1,
              transition: "background 150ms, color 150ms, border-color 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#181818";
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.borderColor = "#444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isFullscreen ? "#1a1a1a" : "#111";
              e.currentTarget.style.color = "#ddd";
              e.currentTarget.style.borderColor = "#333";
            }}
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>

      {/* Presets */}
      <div
        style={{
          display: "flex",
          gap: "0",
          borderBottom: "1px solid #222",
        }}
      >
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => selectPreset(p)}
            style={{
              flex: 1,
              padding: "0.9rem 0",
              background: "transparent",
              border: "none",
              borderRight: "1px solid #222",
              color: "#999",
              fontFamily: "inherit",
              fontSize: "clamp(0.7rem, 1.2vw, 0.9rem)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "color 120ms, background 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#111";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#999";
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Main timer */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {justCompleted && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at center, ${accentColor}08, transparent 70%)`,
              animation: "brutalistPulse 1.2s ease-in-out infinite",
            }}
          />
        )}

        {isEditing ? (
          <input
            autoFocus
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            aria-label="Edit timer"
            style={{
              fontSize: "clamp(5rem, 20vw, 18rem)",
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: "#fff",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${accentColor}`,
              outline: "none",
              fontFamily: "inherit",
              textAlign: "center",
              width: "100%",
              maxWidth: "12ch",
              caretColor: accentColor,
            }}
          />
        ) : (
          <button
            onClick={beginEdit}
            style={{
              fontSize: "clamp(5rem, 20vw, 18rem)",
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: justCompleted ? accentColor : "#fff",
              textShadow:
                warningLevel === "final-ten"
                  ? `0 0 60px ${accentColor}40`
                  : "none",
              transition: "color 300ms, text-shadow 300ms",
              background: "transparent",
              border: "none",
              borderBottom: "2px solid transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
            }}
          >
            {timerLabel}
          </button>
        )}

        <div
          style={{
            marginTop: "1rem",
            fontSize: "0.7rem",
            letterSpacing: "0.4em",
            color: "#444",
            textTransform: "uppercase",
          }}
        >
          {remainingSeconds > 0
            ? `${Math.ceil(remainingSeconds / 60)} min remaining`
            : "TIME IS UP"}
        </div>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-label="Timer elapsed progress"
        aria-valuemin={0}
        aria-valuemax={durationSeconds}
        aria-valuenow={elapsedSeconds}
        aria-valuetext={`${remainingSeconds} seconds remaining`}
        style={{
          position: "relative",
          borderTop: "1px solid #222",
          padding: "0.65rem 0.7rem 0.45rem",
        }}
      >
        <div
          style={{
            position: "relative",
            height: progressBarHeight,
            overflow: "visible",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              display: "flex",
              border: "1px solid #191919",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${greenPercent}%`,
                background: "#00FF41",
              }}
            />
            <div
              style={{
                width: `${yellowPercent}%`,
                background: "#FFB800",
              }}
            />
            <div
              style={{
                width: `${redPercent}%`,
                background: "#FF0040",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${elapsedPercent}%`,
                background: "#000",
                transition: "width 160ms linear",
                pointerEvents: "none",
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: `${pointerPercent}%`,
              top: "-34px",
              width: "42px",
              height: "30px",
              transform: `translateX(${pointerOffset})`,
              transition: "left 160ms linear",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#111",
                clipPath: "polygon(50% 100%, 0 0, 100% 0)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "1px",
                right: "1px",
                top: "1px",
                bottom: "2px",
                background: "#fff",
                clipPath: "polygon(50% 100%, 0 0, 100% 0)",
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          overflow: "visible",
          position: "relative",
          zIndex: 20,
        }}
      >
        {/* Time adjust */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 2rem",
            borderTop: "1px solid #222",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 0,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === "minus" ? null : "minus");
              }}
              style={{
                padding: "0.5rem 0.6rem",
                background: "transparent",
                border: "1px solid #333",
                borderRadius: "4px 0 0 4px",
                color: "#666",
                fontFamily: "inherit",
                fontSize: "0.7rem",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ▾
            </button>
            <button
              onClick={() => addTime(-QUICK_ADJUST)}
              style={{
                padding: "0.5rem 1.2rem",
                background: "transparent",
                border: "1px solid #333",
                borderLeft: "none",
                borderRadius: "0 4px 4px 0",
                color: "#999",
                fontFamily: "inherit",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                cursor: "pointer",
                transition: "color 150ms",
              }}
            >
              -1m
            </button>
            {openMenu === "minus" && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  left: 0,
                  background: "#111",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  padding: "4px 0",
                  zIndex: 120,
                  minWidth: "7rem",
                }}
              >
                {ADJUST_STEPS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      addTime(-s);
                      setOpenMenu(null);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "0.5rem 1rem",
                      background: "transparent",
                      border: "none",
                      color: "#999",
                      fontFamily: "inherit",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      textAlign: "left",
                      cursor: "pointer",
                      letterSpacing: "0.08em",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.background = "#222";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#999";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {fmtSigned("minus", s)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 0,
            }}
          >
            <button
              onClick={() => addTime(QUICK_ADJUST)}
              style={{
                padding: "0.5rem 1.2rem",
                background: "transparent",
                border: "1px solid #333",
                borderRadius: "4px 0 0 4px",
                color: "#999",
                fontFamily: "inherit",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                cursor: "pointer",
                transition: "color 150ms",
              }}
            >
              +1m
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === "plus" ? null : "plus");
              }}
              style={{
                padding: "0.5rem 0.6rem",
                background: "transparent",
                border: "1px solid #333",
                borderLeft: "none",
                borderRadius: "0 4px 4px 0",
                color: "#666",
                fontFamily: "inherit",
                fontSize: "0.7rem",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ▾
            </button>
            {openMenu === "plus" && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  right: 0,
                  background: "#111",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  padding: "4px 0",
                  zIndex: 120,
                  minWidth: "7rem",
                }}
              >
                {ADJUST_STEPS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      addTime(s);
                      setOpenMenu(null);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "0.5rem 1rem",
                      background: "transparent",
                      border: "none",
                      color: "#999",
                      fontFamily: "inherit",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      textAlign: "left",
                      cursor: "pointer",
                      letterSpacing: "0.08em",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.background = "#222";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#999";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {fmtSigned("plus", s)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            borderTop: "1px solid #222",
          }}
        >
          <button
            onClick={toggle}
            style={{
              flex: 2,
              padding: "1.5rem",
              background: isRunning ? "#111" : accentColor,
              color: isRunning ? accentColor : "#000",
              border: "none",
              fontFamily: "inherit",
              fontSize: "clamp(0.9rem, 1.5vw, 1.1rem)",
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "background 150ms, color 150ms",
            }}
          >
            {isRunning ? "PAUSE" : justCompleted ? "RESTART" : "START"}
          </button>
          <button
            onClick={reset}
            style={{
              flex: 1,
              padding: "1.5rem",
              background: "transparent",
              color: "#555",
              border: "none",
              borderLeft: "1px solid #222",
              fontFamily: "inherit",
              fontSize: "clamp(0.9rem, 1.5vw, 1.1rem)",
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "color 150ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
          >
            RESET
          </button>
        </div>
      </div>

      <style>{`
        @keyframes brutalistPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
