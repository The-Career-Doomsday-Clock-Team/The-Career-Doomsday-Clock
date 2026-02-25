"use client";

import type { SkillRisk } from "@/types/result";

/**
 * 스킬 위험도 카드 — DISTRICT Ω 위협 분석
 * Requirements: 5.2
 */
interface SkillRiskCardProps {
  risk: SkillRisk;
  index: number;
}

export function SkillRiskCard({ risk, index }: SkillRiskCardProps) {
  return (
    <div
      className="skill-risk-card animate-fade-in"
      style={{ animationDelay: `${index * 150}ms` }}
      role="article"
      aria-label={`${risk.skill_name} 위험도`}
    >
      <h3 className="dystopia-label mb-3" style={{ fontSize: "0.7rem" }}>
        {risk.skill_name}
      </h3>

      <div className="flex items-baseline gap-4 mb-3">
        <div>
          <span
            className="font-[family-name:var(--font-heading)] text-3xl"
            style={{ color: "var(--neon-red)", textShadow: "0 0 8px var(--neon-red)" }}
          >
            {risk.replacement_prob}%
          </span>
          <span className="text-xs ml-1" style={{ color: "rgba(100,160,200,0.5)" }}>대체 확률</span>
        </div>
        <div>
          <span
            className="font-[family-name:var(--font-heading)] text-xl"
            style={{ color: "var(--neon-yellow)", textShadow: "0 0 6px var(--neon-yellow)" }}
          >
            {risk.time_horizon}년
          </span>
          <span className="text-xs ml-1" style={{ color: "rgba(100,160,200,0.5)" }}>이내</span>
        </div>
      </div>

      <p className="font-[family-name:var(--font-mono)] text-xs leading-relaxed" style={{ color: "rgba(100,160,200,0.6)" }}>
        {risk.justification}
      </p>
    </div>
  );
}
