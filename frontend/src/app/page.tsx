"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * 랜딩 페이지 — 폐허 도시 + 네온사인 배경
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export default function LandingPage() {
  const router = useRouter();

  const handleEnter = useCallback(() => {
    // UUID v4 세션 ID 생성 → sessionStorage 저장 (Req 1.4)
    const sessionId = crypto.randomUUID();
    sessionStorage.setItem("session_id", sessionId);
    router.push("/survey");
  }, [router]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* 폐허 도시 배경 — CSS gradient 레이어 (Req 1.1) */}
      <div className="landing-bg" aria-hidden="true" />

      {/* 네온사인 건물 장식 */}
      <div className="landing-buildings" aria-hidden="true">
        <div className="building building-1" />
        <div className="building building-2" />
        <div className="building building-3" />
        <div className="building building-4" />
        <div className="building building-5" />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        {/* 제목 */}
        <h1 className="neon-text-cyan neon-pulse font-[family-name:var(--font-heading)] text-4xl tracking-wider sm:text-5xl md:text-6xl">
          CAREER
          <br />
          DOOMSDAY CLOCK
        </h1>

        {/* 부제 */}
        <p className="max-w-md font-[family-name:var(--font-mono)] text-sm tracking-wide text-[var(--color-text-muted)] sm:text-base">
          인류 문명이 멸망한 이후, 당신의 직업은 얼마나 살아남을 수 있는가?
        </p>

        {/* 입장 버튼 (Req 1.2) — 로그인 없이 익명 진입 (Req 1.3) */}
        <button
          type="button"
          onClick={handleEnter}
          className="neon-button mt-4 text-base sm:text-lg"
          aria-label="설문 페이지로 이동"
        >
          문을 열고 들어가기
        </button>
      </div>
    </main>
  );
}
