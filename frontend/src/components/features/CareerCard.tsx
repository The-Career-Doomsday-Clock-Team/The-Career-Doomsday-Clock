"use client";

import type { CareerCard } from "@/types/result";
import clsx from "clsx";

/**
 * 커리어 카드 — DISTRICT Ω 탈출 경로
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */

const CARD_THEMES = [
  { border: "neon-border-cyan", accent: "var(--neon-blue)", label: "PATH_ALPHA" },
  { border: "neon-border-magenta", accent: "var(--neon-red)", label: "PATH_BETA" },
  { border: "neon-border-yellow", accent: "var(--neon-yellow)", label: "PATH_GAMMA" },
] as const;

interface CareerCardComponentProps {
  card: CareerCard;
  isTopPick?: boolean;
}

export function CareerCardComponent({ card, isTopPick = false }: CareerCardComponentProps) {
  const theme = CARD_THEMES[card.card_index] ?? CARD_THEMES[0];

  return (
    <div
      className={clsx("career-card", theme.border)}
      role="article"
      aria-label={`커리어 카드 ${card.card_index + 1}`}
    >
      {/* 경로 라벨 */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="font-[family-name:var(--font-heading)] text-[0.7rem] tracking-[0.3em]"
          style={{ color: theme.accent, textShadow: `0 0 6px ${theme.accent}` }}
        >
          {theme.label}
        </div>
        {isTopPick && (
          <span
            className="font-[family-name:var(--font-heading)] text-[0.65rem] tracking-[0.2em] px-2 py-0.5 rounded-sm"
            style={{
              color: "var(--neon-green)",
              border: "1px solid var(--neon-green)",
              textShadow: "0 0 6px var(--neon-green)",
              animation: "success-pulse 2s ease-in-out infinite",
            }}
          >
            ★ TOP PICK
          </span>
        )}
      </div>

      {/* 조합 공식 (Req 6.3) */}
      <p
        className="font-[family-name:var(--font-heading)] text-base tracking-wider mb-5 leading-relaxed"
        style={{ color: "#fff", textShadow: `0 0 6px rgba(255,255,255,0.15)` }}
      >
        {card.combo_formula}
      </p>

      {/* 추천 사유 */}
      <div className="mb-5">
        <h4
          className="font-[family-name:var(--font-heading)] text-[0.7rem] tracking-[0.2em] mb-2 uppercase"
          style={{ color: theme.accent, textShadow: `0 0 4px ${theme.accent}` }}
        >
          RECOMMENDATION
        </h4>
        <p
          className="font-[family-name:var(--font-mono)] text-sm leading-relaxed"
          style={{ color: "rgba(200,220,240,0.75)" }}
        >
          {card.reason}
        </p>
      </div>

      {/* 전환 로드맵 */}
      {card.roadmap && card.roadmap.length > 0 && (
        <div>
          <h4
            className="font-[family-name:var(--font-heading)] text-[0.7rem] tracking-[0.2em] mb-3 uppercase"
            style={{ color: "var(--neon-yellow)", textShadow: "0 0 4px var(--neon-yellow)" }}
          >
            ROADMAP
          </h4>
          <div className="flex flex-col gap-0">
            {card.roadmap.map((step, i) => (
              <div key={i} className="roadmap-step">
                <span
                  className="font-[family-name:var(--font-heading)] text-[0.75rem] shrink-0 min-w-[60px]"
                  style={{ color: theme.accent, textShadow: `0 0 4px ${theme.accent}` }}
                >
                  {step.duration}
                </span>
                <span
                  className="font-[family-name:var(--font-mono)] text-sm"
                  style={{ color: "rgba(200,220,240,0.7)" }}
                >
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
