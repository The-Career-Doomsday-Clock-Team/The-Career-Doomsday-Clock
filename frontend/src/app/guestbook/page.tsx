"use client";

import { useEffect, useState, useCallback, useRef, type FormEvent } from "react";
import type { GuestbookEntry } from "@/types/guestbook";
import { fetchGuestbook, postGuestbook, addReaction, ApiError } from "@/lib/api";

/**
 * 방명록 페이지 — DISTRICT Ω 생존자 기록부
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

const REACTION_EMOJIS = ["😱", "💪", "🤖", "🔥"] as const;
const PAGE_LIMIT = 20;

export default function GuestbookPage() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [jobTitle, setJobTitle] = useState("");
  const [dday, setDday] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [reactingIds, setReactingIds] = useState<Set<string>>(new Set());

  const fetchEntries = useCallback(
    async (key: string | null = null) => {
      if (loading) return;
      setLoading(true);
      try {
        const data = await fetchGuestbook(PAGE_LIMIT, key);
        setEntries((prev) => (key ? [...prev, ...data.items] : data.items));
        setLastKey(data.last_key);
        setHasMore(data.last_key !== null);
      } catch { /* 조용히 처리 */ } finally { setLoading(false); }
    },
    [loading]
  );

  useEffect(() => { fetchEntries(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      (intersections) => { if (intersections[0]?.isIntersecting && hasMore && !loading) fetchEntries(lastKey); },
      { threshold: 0.1 }
    );
    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    observerRef.current = observer;
    return () => { if (sentinel) observer.unobserve(sentinel); observer.disconnect(); };
  }, [hasMore, loading, lastKey, fetchEntries]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setFormError(null);
      if (!message.trim()) { setFormError("> MESSAGE_CONTENT required"); return; }
      if (!jobTitle.trim()) { setFormError("> OCCUPATION_CODE required"); return; }
      const ddayNum = Number(dday);
      if (!dday.trim() || isNaN(ddayNum)) { setFormError("> D-DAY value must be numeric"); return; }

      setSubmitting(true);
      try {
        await postGuestbook({ job_title: jobTitle, dday: ddayNum, message });
        setJobTitle(""); setDday(""); setMessage("");
        setLastKey(null); setHasMore(true);
        await fetchEntries();
      } catch (err) {
        if (err instanceof ApiError) setFormError(err.message);
        else setFormError("통신 장애가 발생했습니다.");
      } finally { setSubmitting(false); }
    },
    [jobTitle, dday, message, fetchEntries]
  );

  const handleReaction = useCallback(
    async (entryId: string, emoji: string) => {
      if (reactingIds.has(entryId)) return;
      setReactingIds((prev) => new Set(prev).add(entryId));
      try {
        const data = await addReaction(entryId, emoji);
        setEntries((prev) => prev.map((entry) =>
          entry.entry_id === entryId ? { ...entry, reactions: data.reactions } : entry
        ));
      } catch { /* 조용히 처리 */ } finally {
        setReactingIds((prev) => { const next = new Set(prev); next.delete(entryId); return next; });
      }
    },
    [reactingIds]
  );

  return (
    <main className="relative min-h-screen px-4 py-12">
      <div className="guestbook-bg" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-2xl flex flex-col gap-10">
        {/* 헤더 */}
        <header className="text-center">
          <div className="panel-tag mb-2" style={{ animation: "neon-flicker2 2.8s infinite" }}>
            // DISTRICT-Ω SURVIVOR LOG
          </div>
          <h1
            className="font-[family-name:var(--font-heading)] text-2xl tracking-wider sm:text-3xl"
            style={{
              color: "#fff",
              textShadow: "0 0 8px var(--neon-blue), 0 0 20px var(--neon-blue), 0 0 50px var(--neon-blue)",
            }}
          >
            SURVIVOR RECORDS
          </h1>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-xs" style={{ color: "rgba(100,160,200,0.5)" }}>
            이 폐허를 지나간 자들의 흔적을 기록하라
          </p>
        </header>

        {/* 등록 폼 */}
        <form onSubmit={handleSubmit} noValidate className="dystopia-panel p-6">
          <div className="panel-scanlines" />
          <div className="relative z-10">
            <div className="panel-tag mb-4">REGISTER_ENTRY</div>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 flex flex-col gap-1.5">
                <label htmlFor="gb-job" className="dystopia-label">OCCUPATION_CODE</label>
                <input id="gb-job" type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="멸망 전 직업" className="dystopia-input" disabled={submitting} autoComplete="off" />
              </div>
              <div className="w-24 flex flex-col gap-1.5">
                <label htmlFor="gb-dday" className="dystopia-label" style={{ color: "var(--neon-yellow)", textShadow: "0 0 4px var(--neon-yellow)" }}>D-DAY</label>
                <input id="gb-dday" type="number" value={dday} onChange={(e) => setDday(e.target.value)}
                  placeholder="년" className="dystopia-input text-center" disabled={submitting} autoComplete="off" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mb-4">
              <label htmlFor="gb-message" className="dystopia-label" style={{ color: "var(--neon-red)", textShadow: "0 0 4px var(--neon-red)" }}>MESSAGE_CONTENT</label>
              <input id="gb-message" type="text" value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="폐허에 남길 한마디를 기록하라" className="dystopia-input" disabled={submitting} autoComplete="off"
                aria-invalid={!!formError} aria-describedby={formError ? "gb-form-error" : undefined} />
            </div>
            {formError && <p id="gb-form-error" className="dystopia-error text-center mb-3" role="alert">⚠ {formError}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={submitting} className="neon-button disabled:opacity-40 disabled:cursor-not-allowed" aria-label="방명록 등록">
                {submitting ? "RECORDING…" : "RECORD ▶"}
              </button>
            </div>
          </div>
        </form>

        {/* 방명록 목록 */}
        <section aria-label="방명록 목록" className="flex flex-col gap-4">
          {entries.length === 0 && !loading && (
            <p className="text-center font-[family-name:var(--font-mono)] text-sm" style={{ color: "rgba(100,160,200,0.4)" }}>
              아직 아무도 흔적을 남기지 않았다...
            </p>
          )}

          {entries.map((entry) => (
            <article key={entry.entry_id} className="guestbook-entry neon-border-cyan" aria-label={`${entry.job_title}의 방명록`}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-[family-name:var(--font-heading)] text-sm tracking-wider neon-text-cyan">
                  {entry.job_title}
                </span>
                <span className="neon-text-red font-[family-name:var(--font-heading)] text-sm">
                  D-{entry.dday}
                </span>
              </div>
              <p className="font-[family-name:var(--font-mono)] text-sm leading-relaxed mb-3" style={{ color: "var(--color-text)" }}>
                {entry.message}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-2" role="group" aria-label="이모지 반응">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => handleReaction(entry.entry_id, emoji)}
                      disabled={reactingIds.has(entry.entry_id)} className="guestbook-reaction-btn" aria-label={`${emoji} 반응 추가`}>
                      <span>{emoji}</span>
                      {(entry.reactions[emoji] ?? 0) > 0 && (
                        <span className="text-xs" style={{ color: "rgba(100,160,200,0.6)" }}>{entry.reactions[emoji]}</span>
                      )}
                    </button>
                  ))}
                </div>
                <time dateTime={entry.created_at} className="font-[family-name:var(--font-mono)] text-xs" style={{ color: "rgba(100,160,200,0.4)" }}>
                  {formatRelativeTime(entry.created_at)}
                </time>
              </div>
            </article>
          ))}

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loading && (
                <p className="font-[family-name:var(--font-mono)] text-xs" style={{ color: "rgba(100,160,200,0.4)", animation: "blink 1.8s step-end infinite" }}>
                  LOADING RECORDS...
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "방금 전";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  return `${Math.floor(diffSec / 86400)}일 전`;
}
