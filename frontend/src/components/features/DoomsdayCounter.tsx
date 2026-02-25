"use client";

import { useEffect, useState } from "react";

/**
 * D-Day 카운트업 — DISTRICT Ω 선고 카운터
 * Requirements: 5.1
 */
interface DoomsdayCounterProps {
  targetDday: number;
  onComplete: () => void;
}

export function DoomsdayCounter({ targetDday, onComplete }: DoomsdayCounterProps) {
  const [currentValue, setCurrentValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (targetDday <= 0) {
      setDone(true);
      onComplete();
      return;
    }

    const duration = 1500;
    const steps = Math.min(targetDday, 60);
    const stepTime = duration / steps;
    const increment = targetDday / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const current = Math.min(Math.round(increment * step), targetDday);
      setCurrentValue(current);
      if (step >= steps) {
        clearInterval(timer);
        setCurrentValue(targetDday);
        setDone(true);
        onComplete();
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [targetDday, onComplete]);

  return (
    <div className="doomsday-counter animate-fade-in" role="status" aria-label={`D-Day ${targetDday}년`}>
      <p className="panel-tag mb-3">VERDICT_COUNTDOWN</p>
      <div className={`doomsday-value ${done ? "" : ""}`}>
        <span
          className="font-[family-name:var(--font-heading)] text-6xl sm:text-7xl md:text-8xl"
          style={{
            color: "#fff",
            textShadow: `0 0 8px var(--neon-red), 0 0 20px var(--neon-red), 0 0 50px var(--neon-red), 0 0 100px rgba(255,34,68,0.5)`,
            animation: done ? "neon-flicker 3.5s infinite" : "none",
          }}
        >
          D-{currentValue}
        </span>
      </div>
      <p className="font-[family-name:var(--font-mono)] text-xs mt-3" style={{ color: "rgba(100,160,200,0.5)" }}>
        년 후, 당신의 직업은 소멸한다
      </p>
    </div>
  );
}
