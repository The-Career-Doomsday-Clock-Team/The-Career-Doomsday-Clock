"use client";

import type { CareerCard } from "@/types/result";
import clsx from "clsx";

/**
 * 커리어 카드 — DISTRICT Ω 탈출 경로
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */

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
    <div className={clsx("career-card", borderClass)} role="article" aria-label={`커리어 카드 ${card.card_index + 1}`}>
      {/* 조합 공식 (Req 6.3) */}
      <p className="font-[family-name:var(--font-heading)] text-sm tracking-wider mb-4" style={{ color: "#fff", textShadow: "0 0 4px rgba(0,207,255,0.3)" }}>
        {card.combo_formula}
      </p>

      {/* 추천 사유 */}
      <div className="mb-4">
        <h4 className="dystopia-label mb-1">RECOMMENDATION</h4>
        <p className="font-[family-name:var(--font-mono)] text-xs leading-relaxed" style={{ color: "rgba(100,160,200,0.6)" }}>
          {card.reason}
        </p>
      </div>

      {/* 전환 로드맵 */}
      {card.roadmap && card.roadmap.length > 0 && (
        <div>
          <h4 className="dystopia-label mb-2" style={{ color: "var(--neon-yellow)", textShadow: "0 0 4px var(--neon-yellow)" }}>
            TRANSITION_ROADMAP
          </h4>
          <div className="flex flex-col">
            {card.roadmap.map((step, i) => (
              <div key={i} className="roadmap-step">
                <span className="font-[family-name:var(--font-heading)] text-xs shrink-0" style={{ color: "var(--neon-red)", textShadow: "0 0 4px var(--neon-red)" }}>
                  {step.duration}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-xs" style={{ color: "rgba(100,160,200,0.6)" }}>
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
