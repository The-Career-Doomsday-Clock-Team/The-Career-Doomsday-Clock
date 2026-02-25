"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ResultData } from "@/types/result";
import { DoomsdayCounter } from "@/components/features/DoomsdayCounter";
import { SkillRiskCard } from "@/components/features/SkillRiskCard";
import { CareerCardComponent } from "@/components/features/CareerCard";

/**
 * 결과 페이지 — DISTRICT Ω 선고 시스템
 * Requirements: 5.1-5.5, 6.1-6.6
 */

type Phase = "doom" | "transition" | "utopia";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<ResultData | null>(null);
  const [phase, setPhase] = useState<Phase>("doom");
  const [counterDone, setCounterDone] = useState(false);
  const [showDivider, setShowDivider] = useState(false);
  const autoTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("result_data");
    if (!stored) { router.push("/"); return; }
    try {
      const data: ResultData = JSON.parse(stored);
      if (data.status !== "completed") { router.push("/loading-screen"); return; }
      setResult(data);
    } catch { router.push("/"); }
  }, [router]);

  const handleCounterComplete = useCallback(() => {
    setCounterDone(true);
    autoTransitionRef.current = setTimeout(() => { setPhase("transition"); }, 2000);
  }, []);

  const handleSkip = useCallback(() => {
    if (phase === "doom" && counterDone) {
      if (autoTransitionRef.current) clearTimeout(autoTransitionRef.current);
      setPhase("transition");
    }
  }, [phase, counterDone]);

  useEffect(() => {
    if (phase === "transition") {
      setShowDivider(true);
      const timer = setTimeout(() => { setPhase("utopia"); }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleEscape = useCallback(() => { router.push("/guestbook"); }, [router]);

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="loading-bg" aria-hidden="true" />
        <p className="relative z-10 panel-tag" style={{ animation: "blink 1.8s step-end infinite" }}>
          LOADING VERDICT DATA...
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen px-4 py-12">
      <div className="result-bg" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* 시스템 태그 */}
        <div className="text-center mb-8">
          <div className="panel-tag" style={{ animation: "neon-flicker2 2.8s infinite" }}>
            // DISTRICT-Ω VERDICT SYSTEM
          </div>
        </div>

        {/* 1단계: 디스토피아 선고 */}
        <section
          className={`flex flex-col items-center gap-8 ${phase !== "doom" ? "opacity-50" : ""} transition-opacity duration-500`}
          onClick={handleSkip}
          role="region"
          aria-label="직업 수명 선고"
        >
          <DoomsdayCounter targetDday={result.dday ?? 0} onComplete={handleCounterComplete} />

          {counterDone && result.skill_risks && (
            <div className="grid w-full gap-4 sm:grid-cols-2">
              {result.skill_risks.map((risk, i) => (
                <SkillRiskCard key={risk.skill_name} risk={risk} index={i} />
              ))}
            </div>
          )}

          {counterDone && phase === "doom" && (
            <p
              className="font-[family-name:var(--font-mono)] text-xs cursor-pointer"
              style={{ color: "rgba(200,180,100,0.6)", animation: "blink 1.8s step-end infinite" }}
            >
              [ CLICK TO PROCEED ]
            </p>
          )}
        </section>

        {/* 구분선 */}
        {showDivider && <div className="result-divider my-10" aria-hidden="true" />}

        {/* 2단계: 유토피아 탈출 */}
        {phase === "utopia" && result.career_cards && (
          <section className="flex flex-col items-center gap-8 animate-fade-in" role="region" aria-label="새로운 직업 제안">
            <div className="text-center">
              <div className="panel-tag mb-2">// ESCAPE PROTOCOL INITIATED</div>
              <h2
                className="font-[family-name:var(--font-heading)] text-2xl tracking-wider sm:text-3xl"
                style={{
                  color: "var(--neon-green)",
                  textShadow: "0 0 8px var(--neon-green), 0 0 20px var(--neon-green), 0 0 50px var(--neon-green)",
                }}
              >
                NEW CAREER PATH
              </h2>
            </div>

            <div className="flex w-full flex-col gap-6">
              {result.career_cards.map((card) => (
                <CareerCardComponent key={card.card_index} card={card} />
              ))}
            </div>

            <button type="button" onClick={handleEscape} className="neon-button mt-4" aria-label="방명록으로 이동">
              ESCAPE THE RUINS ▶
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
