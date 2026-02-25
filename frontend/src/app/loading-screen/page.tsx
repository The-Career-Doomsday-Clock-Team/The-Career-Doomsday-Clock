"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchResult } from "@/lib/api";

/**
 * 로딩 화면 — DISTRICT Ω 분석 시스템
 * Requirements: 4.1, 4.2, 4.3
 */

const LOADING_MESSAGES = [
  "SCANNING SUBJECT DATA...",
  "CALCULATING DOOM INDEX...",
  "AI TRIBUNAL ANALYZING RECORDS...",
  "DOOMSDAY CLOCK CALIBRATING...",
  "SURVIVAL PROBABILITY COMPUTING...",
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

  const pollResult = useCallback(async () => {
    const sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) { router.push("/"); return; }
    try {
      const data = await fetchResult();
      if (data.status === "completed") {
        sessionStorage.setItem("result_data", JSON.stringify(data));
        router.push("/result");
      }
    } catch { /* 폴링 계속 */ }
  }, [router]);

  useEffect(() => {
    const sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) { router.push("/"); return; }

    messageRef.current = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);

    pollResult();
    pollRef.current = setInterval(pollResult, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => { setTimedOut(true); }, TIMEOUT_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (messageRef.current) clearInterval(messageRef.current);
    };
  }, [router, pollResult]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <div className="loading-bg" aria-hidden="true" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        {/* 네온 아이콘 */}
        <div className="loading-clock" aria-hidden="true">
          <span
            className="font-[family-name:var(--font-heading)] text-6xl"
            style={{
              color: "var(--neon-red)",
              textShadow: "0 0 8px var(--neon-red), 0 0 20px var(--neon-red), 0 0 50px var(--neon-red)",
              animation: "neon-flicker 3.5s infinite",
            }}
          >
            ⏳
          </span>
        </div>

        {/* 시스템 태그 */}
        <div className="panel-tag" style={{ animation: "neon-flicker2 2.8s infinite" }}>
          // DISTRICT-Ω ANALYSIS ENGINE
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

        {/* 하단 장식 */}
        <p
          className="text-xs tracking-widest"
          style={{ color: "rgba(100,160,200,0.35)", letterSpacing: "0.3em" }}
        >
          NODE: 192.168.Ω.13 &nbsp;|&nbsp; PROCESSING
        </p>

        {/* 타임아웃 (Req 4.3) */}
        {timedOut && (
          <p className="neon-text-yellow font-[family-name:var(--font-mono)] text-sm tracking-wide animate-fade-in">
            ⚠ EXTENDED ANALYSIS REQUIRED... PLEASE STAND BY
          </p>
        )}
      </div>
    </main>
  );
}
