"use client";

import { useEffect, useState, useCallback, useRef, type FormEvent } from "react";
import type { GuestbookEntry } from "@/types/guestbook";
import { fetchGuestbook, postGuestbook, addReaction, ApiError } from "@/lib/api";

/**
 * 방명록 페이지 — 생존자들의 흔적
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

// 이모지 반응 목록 (Req 8.3)
const REACTION_EMOJIS = ["😱", "💪", "🤖", "🔥"] as const;

const PAGE_LIMIT = 20;

export default function GuestbookPage() {
  // 방명록 목록 상태
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 등록 폼 상태
  const [jobTitle, setJobTitle] = useState("");
  const [dday, setDday] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 무한 스크롤 감지용 ref
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 반응 처리 중인 항목 추적
  const [reactingIds, setReactingIds] = useState<Set<string>>(new Set());

  // ── 방명록 목록 조회 (Req 8.2) ──
  const fetchEntries = useCallback(
    async (key: string | null = null) => {
      if (loading) return;
      setLoading(true);
      try {
        const data = await fetchGuestbook(PAGE_LIMIT, key);
        setEntries((prev) => (key ? [...prev, ...data.items] : data.items));
        setLastKey(data.last_key);
        setHasMore(data.last_key !== null);
      } catch {
        // 조회 실패 시 조용히 처리
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  // 초기 로드
  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 무한 스크롤 (Req 8.2) ──
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (intersections) => {
        if (intersections[0]?.isIntersecting && hasMore && !loading) {
          fetchEntries(lastKey);
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    observerRef.current = observer;

    return () => {
      if (sentinel) observer.unobserve(sentinel);
      observer.disconnect();
    };
  }, [hasMore, loading, lastKey, fetchEntries]);

  // ── 방명록 등록 (Req 8.1, 8.4) ──
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setFormError(null);

      // 클라이언트 측 유효성 검증 (Req 8.4)
      if (!message.trim()) {
        setFormError("한마디를 남겨야 합니다. 빈 메시지는 허용되지 않습니다.");
        return;
      }
      if (!jobTitle.trim()) {
        setFormError("직업명을 입력하십시오.");
        return;
      }
      const ddayNum = Number(dday);
      if (!dday.trim() || isNaN(ddayNum)) {
        setFormError("D-Day 값을 숫자로 입력하십시오.");
        return;
      }

      setSubmitting(true);
      try {
        await postGuestbook({
          job_title: jobTitle,
          dday: ddayNum,
          message: message,
        });

        // 폼 초기화 및 목록 새로고침
        setJobTitle("");
        setDday("");
        setMessage("");
        setLastKey(null);
        setHasMore(true);
        await fetchEntries();
      } catch (err) {
        if (err instanceof ApiError) {
          setFormError(err.message);
        } else {
          setFormError("통신 장애가 발생했습니다. 다시 시도하십시오.");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [jobTitle, dday, message, fetchEntries]
  );

  // ── 이모지 반응 (Req 8.3) ──
  const handleReaction = useCallback(
    async (entryId: string, emoji: string) => {
      if (reactingIds.has(entryId)) return;

      setReactingIds((prev) => new Set(prev).add(entryId));
      try {
        const data = await addReaction(entryId, emoji);
        // 해당 항목의 reactions 업데이트
        setEntries((prev) =>
          prev.map((entry) =>
            entry.entry_id === entryId
              ? { ...entry, reactions: data.reactions }
              : entry
          )
        );
      } catch {
        // 반응 실패 시 조용히 처리
      } finally {
        setReactingIds((prev) => {
          const next = new Set(prev);
          next.delete(entryId);
          return next;
        });
      }
    },
    [reactingIds]
  );

  return (
    <main className="relative min-h-screen px-4 py-12">
      {/* 배경 */}
      <div className="guestbook-bg" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-2xl flex flex-col gap-10">
        {/* 헤더 */}
        <header className="text-center">
          <h1 className="neon-text-cyan font-[family-name:var(--font-heading)] text-2xl tracking-wider sm:text-3xl">
            이 폐허를 지나간 생존자들의 흔적
          </h1>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-muted)]">
            당신의 기록을 남기고 떠나라.
          </p>
        </header>

        {/* ── 등록 폼 (Req 8.1, 8.4) ── */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="guestbook-form flex flex-col gap-4"
        >
          <div className="flex gap-3">
            <fieldset className="flex-1 flex flex-col gap-1">
              <label
                htmlFor="gb-job"
                className="font-[family-name:var(--font-heading)] text-xs tracking-widest text-[var(--color-cyan)] uppercase"
              >
                직업명
              </label>
              <input
                id="gb-job"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="멸망 전 직업"
                className="survey-input"
                disabled={submitting}
                autoComplete="off"
              />
            </fieldset>
            <fieldset className="w-24 flex flex-col gap-1">
              <label
                htmlFor="gb-dday"
                className="font-[family-name:var(--font-heading)] text-xs tracking-widest text-[var(--color-yellow)] uppercase"
              >
                D-Day
              </label>
              <input
                id="gb-dday"
                type="number"
                value={dday}
                onChange={(e) => setDday(e.target.value)}
                placeholder="년"
                className="survey-input text-center"
                disabled={submitting}
                autoComplete="off"
              />
            </fieldset>
          </div>

          <fieldset className="flex flex-col gap-1">
            <label
              htmlFor="gb-message"
              className="font-[family-name:var(--font-heading)] text-xs tracking-widest text-[var(--color-magenta)] uppercase"
            >
              한마디
            </label>
            <input
              id="gb-message"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="폐허에 남길 한마디를 기록하라"
              className="survey-input"
              disabled={submitting}
              autoComplete="off"
              aria-invalid={!!formError}
              aria-describedby={formError ? "gb-form-error" : undefined}
            />
          </fieldset>

          {formError && (
            <p id="gb-form-error" className="survey-error-text text-center" role="alert">
              ⚠ {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="neon-button mx-auto disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="방명록 등록"
          >
            {submitting ? "기록 중..." : "흔적을 남기다"}
          </button>
        </form>

        {/* ── 방명록 목록 (Req 8.2, 8.3) ── */}
        <section aria-label="방명록 목록" className="flex flex-col gap-4">
          {entries.length === 0 && !loading && (
            <p className="text-center font-[family-name:var(--font-mono)] text-sm text-[var(--color-text-muted)]">
              아직 아무도 흔적을 남기지 않았다...
            </p>
          )}

          {entries.map((entry) => (
            <article
              key={entry.entry_id}
              className="guestbook-entry neon-border-cyan"
              aria-label={`${entry.job_title}의 방명록`}
            >
              {/* 상단: 직업명 + D-Day */}
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-[family-name:var(--font-heading)] text-sm tracking-wider text-[var(--color-cyan)]">
                  {entry.job_title}
                </span>
                <span className="neon-text-magenta font-[family-name:var(--font-heading)] text-sm">
                  D-{entry.dday}
                </span>
              </div>

              {/* 메시지 */}
              <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-text)] leading-relaxed mb-3">
                {entry.message}
              </p>

              {/* 하단: 이모지 반응 + 시간 */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2" role="group" aria-label="이모지 반응">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReaction(entry.entry_id, emoji)}
                      disabled={reactingIds.has(entry.entry_id)}
                      className="guestbook-reaction-btn"
                      aria-label={`${emoji} 반응 추가`}
                    >
                      <span>{emoji}</span>
                      {(entry.reactions[emoji] ?? 0) > 0 && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {entry.reactions[emoji]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <time
                  dateTime={entry.created_at}
                  className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-muted)]"
                >
                  {formatRelativeTime(entry.created_at)}
                </time>
              </div>
            </article>
          ))}

          {/* 무한 스크롤 감지 요소 */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loading && (
                <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-muted)]">
                  기록을 불러오는 중...
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/** 상대 시간 포맷 (예: "3분 전", "2시간 전") */
function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "방금 전";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  return `${Math.floor(diffSec / 86400)}일 전`;
}
