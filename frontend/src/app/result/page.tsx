"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ResultData } from "@/types/result";
import { DoomsdayCounter } from "@/components/features/DoomsdayCounter";
import { SkillRiskCard } from "@/components/features/SkillRiskCard";
import { CareerCardComponent } from "@/components/features/CareerCard";

/**
 * 결과 페이지 — 2단계 구조
 * 1단계: 디스토피아 선고 (D-Day + 스킬 위험도)
 * 2단계: 유토피아 탈출 (커리어 카드 3개)
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

  // 결과 데이터 로드
  useEffect(() => {
    const stored = sessionStorage.getItem("result_data");
    if (!stored) {
      router.push("/");
      return;
    }
    try {
      const data: ResultData = JSON.parse(stored);
      if (data.status !== "completed") {
        router.push("/loading-screen");
        return;
      }
      setResult(data);
    } catch {
      router.push("/");
    }
  }, [router]);

  // 카운트업 완료 후 2초 대기 → 자동 전환 (Req 5.3)
  const handleCounterComplete = useCallback(() => {
    setCounterDone(true);
    autoTransitionRef.current = setTimeout(() => {
      setPhase("transition");
    }, 2000);
  }, []);

  // 클릭 시 즉시 전환 (Req 5.4)
  const handleSkip = useCallback(() => {
    if (phase === "doom" && counterDone) {
      if (autoTransitionRef.current) clearTimeout(autoTransitionRef.current);
      setPhase("transition");
    }
  }, [phase, counterDone]);

  // 전환 단계: 구분선 슬라이드인 → 유토피아 (Req 5.5)
  useEffect(() => {
    if (phase === "transition") {
      setShowDivider(true);
      const timer = setTimeout(() => {
        setPhase("utopia");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // 유토피아 탈출 → 방명록 전환 (Req 6.6)
  const handleEscape = useCallback(() => {
    router.push("/guestbook");
  }, [router]);

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="neon-text-cyan font-[family-name:var(--font-mono)] text-sm">
          데이터 로딩 중...
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen px-4 py-12">
      {/* 배경 */}
      <div className="result-bg" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* ── 1단계: 디스토피아 선고 (Req 5.1-5.4) ── */}
        <section
          className={`flex flex-col items-center gap-8 ${phase !== "doom" ? "opacity-60" : ""} transition-opacity duration-500`}
          onClick={handleSkip}
          role="region"
          aria-label="직업 수명 선고"
        >
          {/* D-Day 카운트업 (Req 5.1) */}
          <DoomsdayCounter
            targetDday={result.dday ?? 0}
            onComplete={handleCounterComplete}
          />

          {/* 스킬 위험도 카드 (Req 5.2) */}
          {counterDone && result.skill_risks && (
            <div className="grid w-full gap-4 sm:grid-cols-2">
              {result.skill_risks.map((risk, i) => (
                <SkillRiskCard key={risk.skill_name} risk={risk} index={i} />
              ))}
            </div>
          )}

          {/* 클릭 스킵 안내 */}
          {counterDone && phase === "doom" && (
            <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-muted)] animate-fade-in cursor-pointer">
              화면을 클릭하여 다음 단계로 이동
            </p>
          )}
        </section>

        {/* ── 구분선 슬라이드인 (Req 5.5) ── */}
        {showDivider && (
          <div className="result-divider my-10" aria-hidden="true" />
        )}

        {/* ── 2단계: 유토피아 탈출 (Req 6.1-6.6) ── */}
        {phase === "utopia" && result.career_cards && (
          <section
            className="flex flex-col items-center gap-8 animate-fade-in"
            role="region"
            aria-label="새로운 직업 제안"
          >
            {/* 제목 (Req 6.1) */}
            <h2 className="neon-text-cyan font-[family-name:var(--font-heading)] text-2xl tracking-wider sm:text-3xl text-center">
              당신을 위한 새로운 직업
            </h2>

            {/* 커리어 카드 3개 스태거 페이드인 (Req 6.2, 6.3, 6.4, 6.5) */}
            <div className="flex w-full flex-col gap-6">
              {result.career_cards.map((card) => (
                <CareerCardComponent key={card.card_index} card={card} />
              ))}
            </div>

            {/* 유토피아 탈출 버튼 (Req 6.6) */}
            <button
              type="button"
              onClick={handleEscape}
              className="neon-button mt-4"
              aria-label="방명록으로 이동"
            >
              폐허를 탈출하다
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
