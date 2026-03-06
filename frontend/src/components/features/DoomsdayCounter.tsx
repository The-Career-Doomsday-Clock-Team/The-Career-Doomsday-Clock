"use client";

import { useEffect, useState } from "react";

/**
 * D-Day Count-up — DISTRICT Ω Verdict Counter
 * Requirements: 5.1
 */
interface DoomsdayCounterProps {
  targetYears: number;
  yearsReason?: string;
  onComplete: () => void;
}

export function DoomsdayCounter({ targetYears, yearsReason, onComplete }: DoomsdayCounterProps) {
  const [currentValue, setCurrentValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (targetYears <= 0) {
      setDone(true);
      onComplete();
      return;
    }

    const duration = 1500;
    const steps = Math.min(targetYears, 60);
    const stepTime = duration / steps;
    const increment = targetYears / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const current = Math.min(Math.round(increment * step), targetYears);
      setCurrentValue(current);
      if (step >= steps) {
        clearInterval(timer);
        setCurrentValue(targetYears);
        setDone(true);
        onComplete();
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [targetYears, onComplete]);

  return (
    <div className="doomsday-counter-wrapper animate-fade-in" role="status" aria-label={`Remaining years: ${targetYears}`}>
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
            {currentValue}years
          </span>
        </div>
      </div>

      <p
        className="font-[family-name:var(--font-mono)] text-base mt-4 tracking-wider"
        style={{ color: "rgba(200,220,240,0.7)" }}
      >
        until your career goes extinct
      </p>

      {done && yearsReason && (
        <p
          className="font-[family-name:var(--font-mono)] text-sm mt-3 max-w-md text-center leading-relaxed animate-fade-in"
          style={{ color: "rgba(255,180,100,0.85)" }}
        >
          ⚡ {yearsReason}
        </p>
      )}
    </div>
  );
}
