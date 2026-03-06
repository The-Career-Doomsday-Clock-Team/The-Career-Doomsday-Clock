"use client";

import type { SkillRisk } from "@/types/result";

/**
 * Skill Risk Card — DISTRICT Ω Threat Analysis
 * Requirements: 5.2
 */
interface SkillRiskCardProps {
  risk: SkillRisk;
  index: number;
  isCritical?: boolean;
}

export function SkillRiskCard({ risk, index, isCritical = false }: SkillRiskCardProps) {
  // Determine color based on risk level
  const prob = risk.replacement_prob ?? 0;
  const dangerColor = prob >= 70 ? "var(--neon-red)" : prob >= 40 ? "var(--neon-yellow)" : "var(--neon-green)";

  return (
    <div
      className="skill-risk-card animate-fade-in"
      style={{ animationDelay: `${index * 120}ms` }}
      role="article"
      aria-label={`${risk.skill_name} risk level`}
    >
      {/* 스킬명 */}
      <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: "1px solid rgba(0,207,255,0.15)" }}>
        <h3
          className="font-[family-name:var(--font-heading)] text-sm tracking-[0.2em] uppercase"
          style={{ color: "#e0ecf4" }}
        >
          {risk.skill_name}
        </h3>
        {isCritical && (
          <span
            className="font-[family-name:var(--font-heading)] text-[0.65rem] tracking-[0.2em] px-2 py-0.5 rounded-sm"
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
        <div className="flex flex-col">
          <span
            className="font-[family-name:var(--font-heading)] text-5xl font-black"
            style={{ color: dangerColor, textShadow: `0 0 10px ${dangerColor}` }}
          >
            {prob}%
          </span>
          <span className="text-[0.7rem] tracking-wider mt-1" style={{ color: "rgba(200,220,240,0.6)" }}>
            replacement
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span
            className="font-[family-name:var(--font-heading)] text-3xl font-bold"
            style={{ color: "var(--neon-yellow)", textShadow: "0 0 8px var(--neon-yellow)" }}
          >
            {risk.time_horizon}year
          </span>
          <span className="text-[0.7rem] tracking-wider mt-1" style={{ color: "rgba(200,220,240,0.6)" }}>
            within
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
        className="font-[family-name:var(--font-mono)] text-sm leading-relaxed"
        style={{ color: "rgba(200,220,240,0.9)" }}
      >
        {risk.justification}
      </p>
    </div>
  );
}
