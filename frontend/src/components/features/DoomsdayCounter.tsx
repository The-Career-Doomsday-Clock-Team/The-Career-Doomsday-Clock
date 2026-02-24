"use client";

import { useEffect, useState } from "react";

/**
 * D-Day 카운트업 애니메이션 + 네온 글로우 펄스
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

    const duration = 1500; // 1.5초 동안 카운트업
    const steps = Math.min(targetDday, 60); // 최대 60 프레임
    const stepTime = duration / steps;
    const increment = targetDday / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), targetDday);
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
      <p className="font-[family-name:var(--font-heading)] text-sm tracking-widest text-[var(--color-text-muted)] uppercase mb-2">
        당신의 직업 수명 선고
      </p>
      <div className={`doomsday-value ${done ? "neon-pulse" : ""}`}>
        <span className="neon-text-magenta font-[family-name:var(--font-heading)] text-6xl sm:text-7xl md:text-8xl">
          D-{currentValue}
        </span>
      </div>
      <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-muted)] mt-2">
        년 후, 당신의 직업은 소멸한다
      </p>
    </div>
  );
}
