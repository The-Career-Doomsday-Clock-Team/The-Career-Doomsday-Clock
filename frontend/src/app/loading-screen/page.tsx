"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchResult } from "@/lib/api";

/**
 * 로딩 화면 — 분석 진행 중 세계관 어조 메시지 + 폴링
 * Requirements: 4.1, 4.2, 4.3
 */

// 세계관 어조 로딩 메시지 (Req 4.1)
const LOADING_MESSAGES = [
  "당신의 운명을 계산 중...",
  "폐허 속 데이터를 수집하는 중...",
  "AI 심판관이 당신의 기록을 분석 중...",
  "멸망의 시계가 돌아가고 있다...",
  "생존 확률을 산출하는 중...",
];

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 30000;

export default function LoadingScreen() {
  const router = useRouter();
  const [messageIndex, setMessageIndex] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 폴링 함수: GET /result/{sid} (Req 4.2)
  const pollResult = useCallback(async () => {
    const sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      router.push("/");
      return;
    }

    try {
      const data = await fetchResult();

      if (data.status === "completed") {
        // 분석 완료 → 결과 화면으로 자동 전환 (Req 4.2)
        sessionStorage.setItem("result_data", JSON.stringify(data));
        router.push("/result");
        return;
      }
      // "analyzing" = 아직 분석 중, 계속 폴링
    } catch {
      // 네트워크 오류 또는 202 응답 시 폴링 계속
    }
  }, [router]);

  useEffect(() => {
    // 세션 ID 확인
    const sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      router.push("/");
      return;
    }

    // 로딩 메시지 순환
    messageRef.current = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);

    // 2초 간격 폴링 시작
    pollResult(); // 즉시 1회 호출
    pollRef.current = setInterval(pollResult, POLL_INTERVAL_MS);

    // 30초 타임아웃 (Req 4.3)
    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
    }, TIMEOUT_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (messageRef.current) clearInterval(messageRef.current);
    };
  }, [router, pollResult]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
      {/* 배경 */}
      <div className="loading-bg" aria-hidden="true" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        {/* 네온 펄스 아이콘 */}
        <div className="loading-clock" aria-hidden="true">
          <span className="neon-text-cyan font-[family-name:var(--font-heading)] text-6xl">
            ⏳
          </span>
        </div>

        {/* 로딩 메시지 (Req 4.1) */}
        <p
          className="neon-text-cyan font-[family-name:var(--font-heading)] text-lg tracking-wider sm:text-xl loading-message"
          role="status"
          aria-live="polite"
        >
          {LOADING_MESSAGES[messageIndex]}
        </p>

        {/* 진행 바 */}
        <div className="loading-bar-track">
          <div className="loading-bar-fill" />
        </div>

        {/* 30초 타임아웃 안내 (Req 4.3) */}
        {timedOut && (
          <p className="neon-text-yellow font-[family-name:var(--font-mono)] text-sm tracking-wide animate-fade-in">
            운명 계산에 시간이 더 필요합니다... 잠시만 더 기다려 주십시오.
          </p>
        )}
      </div>
    </main>
  );
}
