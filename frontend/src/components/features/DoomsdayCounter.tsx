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
    <div className="doomsday-counter-wrapper animate-fade-in" role="status" aria-label={`D-Day ${targetDday}년`}>
      <p className="panel-tag mb-2 tracking-[0.4em]">VERDICT_COUNTDOWN</p>

      <div className="doomsday-counter-ring">
        <div className="doomsday-counter-inner">
          <span
            className="font-[family-name:var(--font-heading)] text-7xl sm:text-8xl md:text-9xl font-black"
            style={{
              color: "#fff",
              textShadow: `0 0 10px var(--neon-red), 0 0 30px var(--neon-red), 0 0 60px var(--neon-red), 0 0 120px rgba(255,34,68,0.4)`,
              animation: done ? "neon-flicker 3.5s infinite" : "none",
            }}
          >
            D-{currentValue}
          </span>
        </div>
      </div>

      <p
        className="font-[family-name:var(--font-mono)] text-sm mt-4 tracking-wider"
        style={{ color: "rgba(200,220,240,0.5)" }}
      >
        년 후, 당신의 직업은 소멸한다
      </p>
    </div>
  );
}
