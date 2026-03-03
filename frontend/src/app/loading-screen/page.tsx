"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchResult, submitSurvey } from "@/lib/api";

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
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 타이머/폴링 정리 */
  const clearAllTimers = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (messageRef.current) { clearInterval(messageRef.current); messageRef.current = null; }
  }, []);

  const pollResult = useCallback(async () => {
    const sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) { router.push("/"); return; }
    try {
      const data = await fetchResult();
      if (data.status === "completed") {
        sessionStorage.setItem("result_data", JSON.stringify(data));
        router.push("/result");
      } else if (data.status === "error") {
        setFailed(true);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch { /* 폴링 계속 */ }
  }, [router]);

  /** 폴링 + 타임아웃 시작 */
  const startPolling = useCallback(() => {
    pollResult();
    pollRef.current = setInterval(pollResult, POLL_INTERVAL_MS);
    timeoutRef.current = setTimeout(() => { setTimedOut(true); }, TIMEOUT_MS);
    messageRef.current = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
  }, [pollResult]);

  /** 동일 데이터로 재분석 요청 */
  const handleRetry = useCallback(async () => {
    const raw = sessionStorage.getItem("survey_form");
    if (!raw) { router.push("/survey"); return; }

    setRetrying(true);
    setFailed(false);
    setTimedOut(false);
    clearAllTimers();

    try {
      const form = JSON.parse(raw);
      await submitSurvey({
        name: form.name,
        job_title: form.job_title,
        age_group: form.age_group,
        strengths: form.skills || form.strengths || "",
        hobbies: form.skills || form.hobbies || "",
        desired_work_years: form.desired_work_years,
      });
      // 재분석 요청 성공 → 폴링 재시작
      startPolling();
    } catch {
      setFailed(true);
    } finally {
      setRetrying(false);
    }
  }, [router, clearAllTimers, startPolling]);

  useEffect(() => {
    const sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) { router.push("/"); return; }

    startPolling();

    return clearAllTimers;
  }, [router, startPolling, clearAllTimers]);

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
        {timedOut && !failed && (
          <p className="neon-text-yellow font-[family-name:var(--font-mono)] text-sm tracking-wide animate-fade-in">
            ⚠ EXTENDED ANALYSIS REQUIRED... PLEASE STAND BY
          </p>
        )}

        {/* 분석 실패 시 재시도 */}
        {failed && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <p className="neon-text-red font-[family-name:var(--font-mono)] text-sm tracking-wide">
              ⚠ ANALYSIS FAILED — SYSTEM ERROR DETECTED
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="neon-button neon-button-red disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="동일 데이터로 다시 분석"
              >
                {retrying ? "RETRYING…" : "↻ RETRY"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/survey")}
                className="text-xs tracking-widest border border-gray-600/30 text-gray-400 px-5 py-3 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
                style={{ fontFamily: "var(--font-mono)" }}
                aria-label="처음부터 다시하기"
              >
                ◀ 처음부터 다시하기
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
