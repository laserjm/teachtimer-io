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
  if (parts.some((p) => Number.isNaN(p) || p < 0 || !Number.isFinite(p)))
    return null;
  let total = 0;
  if (parts.length === 1) total = parts[0] * 60;
  else if (parts.length === 2) total = parts[0] * 60 + parts[1];
  else if (parts.length === 3)
    total = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else return null;
  return clamp(Math.round(total), MIN_SECONDS, MAX_SECONDS);
}

/**
 * Variant 2 — "Swiss Grid"
 */
export default function TimerSwiss() {
  const {
    presets,
    isRunning,
    progress,
    warningLevel,
    timerLabel,
    toggle,
    reset,
    selectPreset,
    justCompleted,
    remainingSeconds,
    durationSeconds,
    addTime,
    setDuration,
  } = useTimer();

  /* ---- Editable time ---- */
  const [isEditing, setIsEditing] = useState(false);
  const [timeInput, setTimeInput] = useState("5:00");

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

  /* ---- Adjust dropdown ---- */
  const [openMenu, setOpenMenu] = useState<"minus" | "plus" | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

  const red = "#E42B1E";
  const offWhite = "#F5F2ED";

  const accentColor =
    warningLevel === "final-ten" || warningLevel === "complete"
      ? red
      : warningLevel === "final-minute"
        ? "#D4830A"
        : "#1a1a1a";

  // Vertical progress: fills bottom-to-top
  const progressHeight = `${progress}%`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: offWhite,
        color: "#1a1a1a",
        fontFamily: "var(--font-mono), monospace",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Vertical red progress on left edge */}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "5px",
          height: progressHeight,
          background: accentColor,
          transition: "height 250ms linear, background 300ms",
          zIndex: 20,
        }}
      />

      {/* Top identity bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "2rem 2.5rem 1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
          <span
            style={{
              fontSize: "clamp(0.85rem, 1.5vw, 1.1rem)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            TeachTimer
          </span>
          <span
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.15em",
              color: "#999",
              textTransform: "uppercase",
            }}
          >
            Countdown
          </span>
        </div>
        <span
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.2em",
            color: isRunning ? red : "#bbb",
            fontWeight: 700,
            textTransform: "uppercase",
            transition: "color 200ms",
          }}
        >
          {isRunning ? "Active" : justCompleted ? "Done" : "Ready"}
        </span>
      </div>

      {/* Thin rule */}
      <div
        style={{
          height: "1px",
          background: "#1a1a1a",
          margin: "0 2.5rem",
        }}
      />

      {/* Presets — horizontal, Swiss-style labels */}
      <div
        style={{
          display: "flex",
          gap: "0",
          padding: "0 2.5rem",
          borderBottom: "1px solid #e0ddd8",
        }}
      >
        {presets.map((p) => {
          const isActive = p.durationSeconds === durationSeconds && !isRunning;
          return (
            <button
              key={p.id}
              onClick={() => selectPreset(p)}
              style={{
                padding: "1rem 1.5rem 1rem 0",
                background: "transparent",
                border: "none",
                color: isActive ? "#1a1a1a" : "#bbb",
                fontFamily: "inherit",
                fontSize: "clamp(0.7rem, 1.1vw, 0.85rem)",
                fontWeight: isActive ? 700 : 400,
                letterSpacing: "0.08em",
                cursor: "pointer",
                transition: "color 150ms",
                textTransform: "uppercase",
                position: "relative",
              }}
            >
              {p.name}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: "1.5rem",
                    height: "2px",
                    background: red,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Main timer — massive, left-aligned for editorial feel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 2.5rem",
          position: "relative",
        }}
      >
        {/* Huge type */}
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
              fontSize: "clamp(6rem, 22vw, 22rem)",
              fontWeight: 700,
              lineHeight: 0.9,
              letterSpacing: "-0.06em",
              color: "#1a1a1a",
              background: "transparent",
              border: "none",
              borderBottom: `3px solid ${red}`,
              outline: "none",
              fontFamily: "inherit",
              width: "100%",
              maxWidth: "12ch",
              marginLeft: "-0.4rem",
              caretColor: red,
            }}
          />
        ) : (
          <button
            onClick={beginEdit}
            style={{
              fontSize: "clamp(6rem, 22vw, 22rem)",
              fontWeight: 700,
              lineHeight: 0.9,
              letterSpacing: "-0.06em",
              color:
                justCompleted || warningLevel === "final-ten" ? red : "#1a1a1a",
              transition: "color 300ms",
              marginLeft: "-0.4rem",
              background: "transparent",
              border: "none",
              borderBottom: "3px solid transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
              textAlign: "left",
            }}
          >
            {timerLabel}
          </button>
        )}

        {/* Auxiliary info — right-aligned, small */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: "1.5rem",
          }}
        >
          <span
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.3em",
              color: "#999",
              textTransform: "uppercase",
            }}
          >
            {remainingSeconds > 0
              ? `${Math.ceil(remainingSeconds / 60)} minutes remaining`
              : "Time elapsed"}
          </span>
          <span
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.15em",
              color: "#ccc",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(progress)}%
          </span>
        </div>

        {/* Time adjust */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "1.5rem",
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
                padding: "0.45rem 0.55rem",
                background: "transparent",
                border: "1px solid #ccc",
                borderRadius: "3px 0 0 3px",
                color: "#999",
                fontFamily: "inherit",
                fontSize: "0.65rem",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ▾
            </button>
            <button
              onClick={() => addTime(-QUICK_ADJUST)}
              style={{
                padding: "0.45rem 1rem",
                background: "transparent",
                border: "1px solid #ccc",
                borderLeft: "none",
                borderRadius: "0 3px 3px 0",
                color: "#1a1a1a",
                fontFamily: "inherit",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
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
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "4px 0",
                  zIndex: 50,
                  minWidth: "7rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
                      padding: "0.45rem 1rem",
                      background: "transparent",
                      border: "none",
                      color: "#999",
                      fontFamily: "inherit",
                      fontSize: "0.7rem",
                      fontWeight: 500,
                      textAlign: "left",
                      cursor: "pointer",
                      letterSpacing: "0.06em",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#1a1a1a";
                      e.currentTarget.style.background = "#f0ede8";
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
                padding: "0.45rem 1rem",
                background: "transparent",
                border: "1px solid #ccc",
                borderRadius: "3px 0 0 3px",
                color: "#1a1a1a",
                fontFamily: "inherit",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
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
                padding: "0.45rem 0.55rem",
                background: "transparent",
                border: "1px solid #ccc",
                borderLeft: "none",
                borderRadius: "0 3px 3px 0",
                color: "#999",
                fontFamily: "inherit",
                fontSize: "0.65rem",
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
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "4px 0",
                  zIndex: 50,
                  minWidth: "7rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
                      padding: "0.45rem 1rem",
                      background: "transparent",
                      border: "none",
                      color: "#999",
                      fontFamily: "inherit",
                      fontSize: "0.7rem",
                      fontWeight: 500,
                      textAlign: "left",
                      cursor: "pointer",
                      letterSpacing: "0.06em",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#1a1a1a";
                      e.currentTarget.style.background = "#f0ede8";
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
      </div>

      {/* Bottom controls — thick rule + buttons */}
      <div
        style={{
          borderTop: "2px solid #1a1a1a",
          display: "flex",
        }}
      >
        <button
          onClick={toggle}
          style={{
            flex: 2,
            padding: "1.6rem 2.5rem",
            background: isRunning
              ? "transparent"
              : justCompleted
                ? red
                : "#1a1a1a",
            color: isRunning ? "#1a1a1a" : offWhite,
            border: "none",
            fontFamily: "inherit",
            fontSize: "clamp(0.8rem, 1.3vw, 1rem)",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "background 200ms, color 200ms",
            textAlign: "left",
          }}
        >
          {isRunning ? "Pause" : justCompleted ? "Restart" : "Start"}
        </button>
        <button
          onClick={reset}
          style={{
            flex: 1,
            padding: "1.6rem 2.5rem",
            background: "transparent",
            color: "#bbb",
            border: "none",
            borderLeft: "1px solid #e0ddd8",
            fontFamily: "inherit",
            fontSize: "clamp(0.8rem, 1.3vw, 1rem)",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "color 150ms",
            textAlign: "left",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
