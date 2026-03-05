"use client";

import type { SkillRisk } from "@/types/result";

/**
 * 스킬 위험도 카드 — DISTRICT Ω 위협 분석
 * Requirements: 5.2
 */
interface SkillRiskCardProps {
  risk: SkillRisk;
  index: number;
  isCritical?: boolean;
}

export function SkillRiskCard({ risk, index, isCritical = false }: SkillRiskCardProps) {
  // 위험도에 따라 색상 결정
  const prob = risk.replacement_prob ?? 0;
  const dangerColor = prob >= 70 ? "var(--neon-red)" : prob >= 40 ? "var(--neon-yellow)" : "var(--neon-green)";

  return (
    <div
      className="skill-risk-card animate-fade-in"
      style={{ animationDelay: `${index * 120}ms` }}
      role="article"
      aria-label={`${risk.skill_name} 위험도`}
    >
      {/* 스킬명 */}
      <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: "1px solid rgba(0,207,255,0.15)" }}>
        <h3
          className="font-[family-name:var(--font-heading)] text-xs tracking-[0.2em] uppercase"
          style={{ color: "#e0ecf4" }}
        >
          {risk.skill_name}
        </h3>
        {isCritical && (
          <span
            className="font-[family-name:var(--font-heading)] text-[0.55rem] tracking-[0.2em] px-2 py-0.5 rounded-sm"
            style={{
              color: "var(--neon-red)",
              border: "1px solid var(--neon-red)",
              textShadow: "0 0 6px var(--neon-red)",
              animation: "neon-flicker 3.5s infinite",
            }}
          >
            CRITICAL
          </span>
        )}
      </div>

      {/* 수치 */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <span
            className="font-[family-name:var(--font-heading)] text-4xl font-black"
            style={{ color: dangerColor, textShadow: `0 0 10px ${dangerColor}` }}
          >
            {prob}%
          </span>
          <span className="text-[0.65rem] ml-1.5 tracking-wider" style={{ color: "rgba(200,220,240,0.8)" }}>
            대체 확률
          </span>
        </div>
        <div className="text-right">
          <span
            className="font-[family-name:var(--font-heading)] text-2xl font-bold"
            style={{ color: "var(--neon-yellow)", textShadow: "0 0 8px var(--neon-yellow)" }}
          >
            {risk.time_horizon}년
          </span>
          <span className="text-[0.65rem] ml-1 tracking-wider" style={{ color: "rgba(200,220,240,0.8)" }}>
            이내
          </span>
        </div>
      </div>

      {/* 위험도 바 */}
      <div className="w-full h-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${prob}%`,
            background: `linear-gradient(90deg, ${dangerColor}, ${dangerColor})`,
            boxShadow: `0 0 8px ${dangerColor}`,
          }}
        />
      </div>

      {/* 근거 */}
      <p
        className="font-[family-name:var(--font-mono)] text-xs leading-relaxed"
        style={{ color: "rgba(200,220,240,0.9)" }}
      >
        {risk.justification}
      </p>
    </div>
  );
}
