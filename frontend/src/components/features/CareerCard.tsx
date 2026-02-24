"use client";

import type { CareerCard } from "@/types/result";
import clsx from "clsx";

/**
 * 커리어 카드 — 조합 공식, 추천 사유, 전환 로드맵
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */

// 네온 테두리 색상 순서: cyan, magenta, yellow (Req 6.4)
const NEON_BORDER_CLASSES = [
  "neon-border-cyan",
  "neon-border-magenta",
  "neon-border-yellow",
] as const;

interface CareerCardComponentProps {
  card: CareerCard;
}

export function CareerCardComponent({ card }: CareerCardComponentProps) {
  const borderClass = NEON_BORDER_CLASSES[card.card_index] ?? NEON_BORDER_CLASSES[0];

  return (
    <div
      className={clsx("career-card", borderClass)}
      role="article"
      aria-label={`커리어 카드 ${card.card_index + 1}`}
    >
      {/* 조합 공식 (Req 6.3) */}
      <p className="font-[family-name:var(--font-heading)] text-sm tracking-wider text-[var(--color-text)] mb-4">
        {card.combo_formula}
      </p>

      {/* 추천 사유 (Req 6.3) */}
      <div className="mb-4">
        <h4 className="font-[family-name:var(--font-heading)] text-xs tracking-widest text-[var(--color-cyan)] uppercase mb-1">
          추천 사유
        </h4>
        <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-muted)] leading-relaxed">
          {card.reason}
        </p>
      </div>

      {/* 전환 로드맵 (Req 6.3) */}
      {card.roadmap && card.roadmap.length > 0 && (
        <div>
          <h4 className="font-[family-name:var(--font-heading)] text-xs tracking-widest text-[var(--color-yellow)] uppercase mb-2">
            전환 로드맵
          </h4>
          <div className="flex flex-col">
            {card.roadmap.map((step, i) => (
              <div key={i} className="roadmap-step">
                <span className="font-[family-name:var(--font-heading)] text-xs text-[var(--color-magenta)] shrink-0">
                  {step.duration}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-muted)]">
                  {step.step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
