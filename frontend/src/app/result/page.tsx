"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ResultData } from "@/types/result";
import { submitSurvey } from "@/lib/api";
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
  const [retrying, setRetrying] = useState(false);
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

  /** 동일 데이터로 AI 재분석 */
  const handleRetryAnalysis = useCallback(async () => {
    const raw = sessionStorage.getItem("survey_form");
    if (!raw) { router.push("/survey"); return; }

    setRetrying(true);
    try {
      const form = JSON.parse(raw);
      await submitSurvey({
        name: form.name,
        job_title: form.job_title,
        age_group: form.age_group,
        strengths: form.skills || form.strengths || "",
        hobbies: form.skills || form.hobbies || "",
      });
      sessionStorage.removeItem("result_data");
      router.push("/loading-screen");
    } catch {
      setRetrying(false);
    }
  }, [router]);

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
    <main className="relative min-h-screen flex flex-col items-center px-4 py-16">
      <div className="result-bg" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-4xl">
        {/* 시스템 태그 */}
        <div className="text-center mb-12">
          <div className="panel-tag tracking-[0.4em]" style={{ animation: "neon-flicker2 2.8s infinite" }}>
            // DISTRICT-Ω VERDICT SYSTEM
          </div>
        </div>

        {/* 1단계: 디스토피아 선고 */}
        <section
          className={`flex flex-col items-center gap-10 ${phase !== "doom" ? "opacity-80" : ""} transition-opacity duration-700`}
          onClick={handleSkip}
          role="region"
          aria-label="직업 수명 선고"
        >
          <DoomsdayCounter targetYears={result.remaining_years ?? 0} yearsReason={result.remaining_years_reason} onComplete={handleCounterComplete} />

          {counterDone && result.skill_risks && (
            <>
              <div className="text-center">
                <h2 className="result-section-title text-neon-red">THREAT ANALYSIS</h2>
                <p className="result-section-sub">AI 대체 위험도 분석 결과 (위험도 순)</p>
              </div>
              <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[...result.skill_risks]
                  .sort((a, b) => (b.replacement_prob ?? 0) - (a.replacement_prob ?? 0))
                  .map((risk, i) => (
                    <SkillRiskCard key={risk.skill_name} risk={risk} index={i} isCritical={i === 0} />
                  ))}
              </div>
            </>
          )}

          {counterDone && phase === "doom" && (
            <p
              className="font-[family-name:var(--font-mono)] text-sm cursor-pointer mt-4"
              style={{ color: "rgba(200,180,100,0.6)", animation: "blink 1.8s step-end infinite" }}
            >
              [ CLICK TO PROCEED ]
            </p>
          )}
        </section>

        {/* 구분선 */}
        {showDivider && <div className="result-divider my-14" aria-hidden="true" />}

        {/* 2단계: 유토피아 탈출 */}
        {phase === "utopia" && result.career_cards && (
          <section className="flex flex-col items-center gap-10 animate-fade-in" role="region" aria-label="새로운 직업 제안">
            <div className="text-center">
              <div className="panel-tag mb-3 tracking-[0.4em]">// ESCAPE PROTOCOL INITIATED</div>
              <h2 className="result-section-title text-neon-green">SURVIVOR PROTOCOL</h2>
              <p className="result-section-sub">AI 시대를 살아남기 위한 커리어 전환 경로</p>
            </div>

            <div className="grid w-full gap-6 md:grid-cols-3">
              {result.career_cards.map((card) => (
                <CareerCardComponent key={card.card_index} card={card} isTopPick={card.card_index === 0} />
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <button
                type="button"
                onClick={handleRetryAnalysis}
                disabled={retrying}
                className="neon-button neon-button-red disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="동일 데이터로 다시 분석"
              >
                {retrying ? "RETRYING…" : "↻ RETRY ANALYSIS"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/survey")}
                className="text-xs tracking-widest border border-yellow-500/40 text-yellow-400 px-5 py-3 hover:border-yellow-400/70 hover:text-yellow-300 transition-all"
                style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}
                aria-label="처음부터 새롭게 시작"
              >
                ◀ START OVER
              </button>
              <button type="button" onClick={handleEscape} className="neon-button" aria-label="방명록으로 이동">
                ESCAPE THE RUINS ▶
              </button>
            </div>
          </section>
        )}

        {/* 데이터 출처 푸터 */}
        <footer className="mt-16 pt-6 text-center" style={{ borderTop: "1px solid rgba(0,207,255,0.1)" }}>
          <p className="text-[0.6rem] tracking-wider leading-relaxed" style={{ color: "rgba(100,160,200,0.4)" }}>
            본 분석은 World Economic Forum 「Future of Jobs Report 2025」를 기반으로 합니다.
          </p>
          <p className="text-[0.55rem] tracking-wider mt-1" style={{ color: "rgba(100,160,200,0.25)" }}>
            Licensed under CC BY-NC-ND 4.0 · World Economic Forum
          </p>
        </footer>
      </div>
    </main>
  );
}
