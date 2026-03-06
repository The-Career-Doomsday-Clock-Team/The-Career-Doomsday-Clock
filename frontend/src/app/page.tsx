"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Landing Page — DISTRICT Ω Dystopia Storefront
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export default function LandingPage() {
  const router = useRouter();

  const handleEnter = useCallback(() => {
    // Generate UUID v4 session ID → save to sessionStorage (Req 1.4)
    const sessionId = crypto.randomUUID();
    sessionStorage.setItem("session_id", sessionId);
    router.push("/survey");
  }, [router]);

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
      {/* 배경 이미지 (Req 1.1) */}
      <div className="scene-bg" aria-hidden="true" />
      <div className="scene-overlay" aria-hidden="true" />
      <div className="scene-scanlines" aria-hidden="true" />
      <div className="scene-noise" aria-hidden="true" />

      {/* 좌상단 장식 */}
      <div
        className="neon-deco"
        style={{ top: 32, left: 32, color: "var(--neon-green)", textShadow: "0 0 8px var(--neon-green)" }}
        aria-hidden="true"
      >
        SYS:ONLINE &nbsp;▮&nbsp; SECTOR-7G
        <br />
        STATUS: <span style={{ color: "var(--neon-red)" }}>RESTRICTED</span>
      </div>

      {/* 우상단 장식 */}
      <div
        className="neon-deco"
        style={{ top: 32, right: 32, color: "var(--neon-blue)", textShadow: "0 0 8px var(--neon-blue)", animation: "neon-flicker 5s infinite 1s" }}
        aria-hidden="true"
      >
        CAM-04 &nbsp;●&nbsp; LIVE
        <br />
        ████ SURVEILLANCE ████
      </div>

      {/* 간판 타이틀 */}
      <div className="relative z-10 text-center mb-5">
        <h1 className="sign-title">CAREER DOOMSDAY</h1>
        <p className="sign-sub">▸ Your career lifespan will be sentenced ◂</p>
      </div>

      {/* 문 (Req 1.2, 1.3) */}
      <div className="relative z-10 flex flex-col items-center gap-5 mt-3">
        <div
          className="door-btn"
          onClick={handleEnter}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleEnter(); }}
          role="button"
          aria-label="Enter the survey page"
          tabIndex={0}
          title="Click to enter"
        >
          <div className="door-glow" />
          <div
            className="absolute top-6 left-1/2 -translate-x-1/2"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.2rem",
              color: "rgba(255,200,80,0.7)",
              textShadow: "0 0 8px rgba(255,200,80,0.5)",
              letterSpacing: "0.1em",
            }}
          >
            Ω-13
          </div>
          <div className="door-handle" />
          <div
            className="absolute bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap"
            style={{
              fontSize: "0.55rem",
              letterSpacing: "0.1em",
              color: "rgba(255,34,68,0.7)",
              textShadow: "0 0 4px var(--neon-red)",
              border: "1px solid rgba(255,34,68,0.4)",
              padding: "2px 5px",
            }}
          >
            ⚠ BIOMETRIC ID REQUIRED
          </div>
        </div>
        <div className="door-label">[ CLICK TO ENTER ]</div>
      </div>

      {/* 좌하단 */}
      <div
        className="neon-deco"
        style={{ bottom: 28, left: 32, fontSize: "0.65rem", color: "rgba(255,230,0,0.6)", textShadow: "0 0 6px var(--neon-yellow)" }}
        aria-hidden="true"
      >
        NODE: 192.168.Ω.13 &nbsp;|&nbsp; ENC: AES-512
      </div>

      {/* 우하단 */}
      <div
        className="neon-deco"
        style={{ bottom: 28, right: 32, fontSize: "0.65rem", color: "rgba(255,34,68,0.6)", textShadow: "0 0 6px var(--neon-red)", animation: "blink 2.4s step-end infinite" }}
        aria-hidden="true"
      >
        ⚠ WARNING: TRESPASSERS WILL BE PROCESSED
      </div>
    </main>
  );
}
