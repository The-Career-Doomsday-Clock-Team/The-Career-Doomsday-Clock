"use client";

import type { SkillRisk } from "@/types/result";

/**
 * 스킬별 위험도 카드 — 확률%, 시간, 근거
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
      {/* 스킬명 */}
      <h3 className="font-[family-name:var(--font-heading)] text-sm tracking-wider text-[var(--color-cyan)] uppercase mb-3">
        {risk.skill_name}
      </h3>

      {/* 확률 + 시간 */}
      <div className="flex items-baseline gap-4 mb-3">
        <div>
          <span className="neon-text-magenta font-[family-name:var(--font-heading)] text-3xl">
            {risk.replacement_prob}%
          </span>
          <span className="text-[var(--color-text-muted)] text-xs ml-1">대체 확률</span>
        </div>
        <div>
          <span className="neon-text-yellow font-[family-name:var(--font-heading)] text-xl">
            {risk.time_horizon}년
          </span>
          <span className="text-[var(--color-text-muted)] text-xs ml-1">이내</span>
        </div>
      </div>

      {/* 근거 텍스트 */}
      <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-muted)] leading-relaxed">
        {risk.justification}
      </p>
    </div>
  );
}
