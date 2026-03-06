"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { GuestbookEntry } from "@/types/guestbook";
import { fetchGuestbook, postGuestbook, addReaction, fetchResult, fetchRanking, ApiError } from "@/lib/api";
import { JobRiskRanking, type JobRiskData } from "@/components/features/JobRiskRanking";
import { useRouter } from "next/navigation";

/**
 * Guestbook Page — DISTRICT Ω Survivor Log
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

const REACTION_EMOJIS = ["😱", "💪", "🤖", "🔥", "👍", "❤️"] as const;
const PAGE_LIMIT = 20;
const MESSAGE_MAX_LENGTH = 250;

export default function GuestbookPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [jobTitle, setJobTitle] = useState("");
  const [remainingYears, setRemainingYears] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [reactingIds, setReactingIds] = useState<Set<string>>(new Set());
  const [loadingResult, setLoadingResult] = useState(true);
  const [skills, setSkills] = useState("");
  const [rankingEndangered, setRankingEndangered] = useState<JobRiskData[]>([]);
  const [rankingSurvived, setRankingSurvived] = useState<JobRiskData[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [rankingError, setRankingError] = useState(false);
  // Whether guestbook has been submitted (hide form)
  const [hasSubmitted, setHasSubmitted] = useState(false);
  // Card expand state (entry_id → boolean)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchEntries = useCallback(
    async (key: string | null = null) => {
      if (loading) return;
      setLoading(true);
      try {
        const data = await fetchGuestbook(PAGE_LIMIT, key);
        setEntries((prev) => (key ? [...prev, ...data.items] : data.items));
        setLastKey(data.last_key);
        setHasMore(data.last_key !== null);
      } catch { /* silently handle */ } finally { setLoading(false); }
    },
    [loading]
  );

  // Load analysis result and auto-fill
  useEffect(() => {
    const loadAnalysisResult = async () => {
      try {
        const result = await fetchResult();
        if (result.status === "completed" && result.remaining_years !== undefined) {
          const surveyData = sessionStorage.getItem("survey_form");
          if (surveyData) {
            const parsed = JSON.parse(surveyData);
            setJobTitle(parsed.job_title || "");
            const rawSkills = parsed.skills;
            if (Array.isArray(rawSkills)) {
              setSkills(rawSkills.join(", "));
            } else if (typeof rawSkills === "string") {
              setSkills(rawSkills);
            }
          }
          setRemainingYears(String(result.remaining_years));
        } else {
          router.push("/");
        }
      } catch {
        router.push("/");
      } finally {
        setLoadingResult(false);
      }
    };

    loadAnalysisResult();
    fetchEntries();

    // Load ranking data
    const loadRanking = async () => {
      try {
        const res = await fetchRanking();
        setRankingEndangered(res.most_endangered);
        setRankingSurvived(res.most_survived);
      } catch {
        setRankingError(true);
      } finally {
        setRankingLoading(false);
      }
    };
    loadRanking();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  // Check if session already submitted on page load
  useEffect(() => {
    if (entries.length > 0) {
      const sessionId = sessionStorage.getItem("session_id");
      if (sessionId) {
        // Cannot verify if guestbook entry exists for current session,
        // so use sessionStorage flag as secondary check
        const alreadyPosted = sessionStorage.getItem("guestbook_posted");
        if (alreadyPosted === "true") {
          setHasSubmitted(true);
        }
      }
    }
  }, [entries]);

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
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      if (!message.trim()) { setFormError("> MESSAGE_CONTENT required"); return; }
      if (message.length > MESSAGE_MAX_LENGTH) { setFormError(`> Message must be ${MESSAGE_MAX_LENGTH} characters or less`); return; }
      if (!jobTitle.trim()) { setFormError("> OCCUPATION_CODE required"); return; }
      const ryNum = Number(remainingYears);
      if (!remainingYears.trim() || isNaN(ryNum)) { setFormError("> REMAINING_YEARS value must be numeric"); return; }

      setSubmitting(true);
      try {
        await postGuestbook({ job_title: jobTitle, remaining_years: ryNum, message, skills: skills || undefined });
        // Submission success — hide form + save sessionStorage flag
        setHasSubmitted(true);
        sessionStorage.setItem("guestbook_posted", "true");
        setLastKey(null); setHasMore(true);
        await fetchEntries();
      } catch (err) {
        if (err instanceof ApiError) {
          // 409: Already submitted session
          if (err.status === 409) {
            setHasSubmitted(true);
            sessionStorage.setItem("guestbook_posted", "true");
          }
          setFormError(err.message);
        } else {
          setFormError("COMMUNICATION_FAILURE — Please try again.");
        }
      } finally { setSubmitting(false); }
    },
    [jobTitle, remainingYears, message, skills, fetchEntries]
  );

  const handleReaction = useCallback(
    async (entryId: string, emoji: string, createdAt: string) => {
      if (reactingIds.has(entryId)) return;
      setReactingIds((prev) => new Set(prev).add(entryId));
      try {
        const data = await addReaction(entryId, emoji, createdAt);
        setEntries((prev) => prev.map((entry) =>
          entry.entry_id === entryId ? { ...entry, reactions: data.reactions } : entry
        ));
      } catch { /* silently handle */ } finally {
        setReactingIds((prev) => { const next = new Set(prev); next.delete(entryId); return next; });
      }
    },
    [reactingIds]
  );

  const toggleExpand = useCallback((entryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }, []);

  // Loading analysis result
  if (loadingResult) {
    return (
      <main className="relative min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="guestbook-bg" aria-hidden="true" />
        <p className="relative z-10 font-[family-name:var(--font-mono)] text-base" style={{ color: "rgba(100,160,200,0.6)", animation: "blink 1.8s step-end infinite" }}>
          LOADING...
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen px-4 py-12">
      <div className="guestbook-bg" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-6xl flex flex-col gap-10">
        {/* 헤더 */}
        <header className="text-center">
          <div className="panel-tag mb-2" style={{ animation: "neon-flicker2 2.8s infinite" }}>
            // DISTRICT-Ω SURVIVOR LOG
          </div>
          <h1
            className="font-[family-name:var(--font-heading)] text-3xl tracking-wider sm:text-4xl"
            style={{
              color: "#fff",
              textShadow: "0 0 8px var(--neon-blue), 0 0 20px var(--neon-blue), 0 0 50px var(--neon-blue)",
            }}
          >
            SURVIVOR RECORDS
          </h1>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-sm" style={{ color: "rgba(100,160,200,0.5)" }}>
            Record the traces of those who passed through these ruins
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <button type="button" onClick={() => router.push("/")}
              className="text-xs tracking-widest border border-gray-600/30 text-gray-400 px-4 py-2 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              style={{ fontFamily: "var(--font-mono)" }}>
              ← HOME
            </button>
            <button type="button" onClick={() => router.push("/result")}
              className="text-xs tracking-widest border border-gray-600/30 text-gray-400 px-4 py-2 hover:border-red-500/50 hover:text-red-400 transition-all"
              style={{ fontFamily: "var(--font-mono)" }}>
              ← RESULT
            </button>
          </div>
        </header>

        {/* 등록 폼 — 이미 등록했으면 숨김 (가운데 좁게) */}
        <div className="mx-auto w-full max-w-2xl">
        {hasSubmitted ? (
          <div className="dystopia-panel p-6">
            <div className="panel-scanlines" />
            <div className="relative z-10 text-center">
              <div className="panel-tag mb-3">RECORD_COMPLETE</div>
              <p className="font-[family-name:var(--font-mono)] text-sm" style={{ color: "var(--neon-cyan, #00e5ff)", textShadow: "0 0 6px rgba(0,255,255,0.4)" }}>
                ✓ Your record has already been logged
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="dystopia-panel p-6">
            <div className="panel-scanlines" />
            <div className="relative z-10">
              <div className="panel-tag mb-4">REGISTER_ENTRY</div>
              <div className="flex gap-3 mb-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label htmlFor="gb-job" className="dystopia-label">OCCUPATION_CODE</label>
                  <input id="gb-job" type="text" value={jobTitle} readOnly
                    placeholder="Pre-doom occupation" className="dystopia-input opacity-70 cursor-not-allowed" autoComplete="off" />
                </div>
                <div className="w-24 flex flex-col gap-1.5">
                  <label htmlFor="gb-ry" className="dystopia-label" style={{ color: "var(--neon-yellow)", textShadow: "0 0 4px var(--neon-yellow)" }}>Years Left</label>
                  <input id="gb-ry" type="text" value={remainingYears} readOnly
                    placeholder="yr" className="dystopia-input text-center opacity-70 cursor-not-allowed" autoComplete="off" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mb-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="gb-message" className="dystopia-label" style={{ color: "var(--neon-red)", textShadow: "0 0 4px var(--neon-red)" }}>MESSAGE_CONTENT</label>
                  <span className="font-[family-name:var(--font-mono)] text-xs" style={{ color: message.length > MESSAGE_MAX_LENGTH ? "var(--neon-red)" : "rgba(100,160,200,0.5)" }}>
                    {message.length}/{MESSAGE_MAX_LENGTH}
                  </span>
                </div>
                <input id="gb-message" type="text" value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX_LENGTH))}
                  maxLength={MESSAGE_MAX_LENGTH}
                  placeholder="Leave your last words in the ruins" className="dystopia-input" disabled={submitting} autoComplete="off"
                  aria-invalid={!!formError} aria-describedby={formError ? "gb-form-error" : undefined} />
              </div>
              {formError && <p id="gb-form-error" className="dystopia-error text-center mb-3" role="alert">⚠ {formError}</p>}
              <div className="flex justify-end">
                <button type="submit" disabled={submitting} className="neon-button disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Submit guestbook entry">
                  {submitting ? "RECORDING…" : "RECORD ▶"}
                </button>
              </div>
            </div>
          </form>
        )}
        </div>

        {/* 랭킹 섹션 설명 */}
        <div className="text-center">
          <p className="font-[family-name:var(--font-mono)] text-base tracking-wider" style={{ color: "var(--neon-yellow)", textShadow: "0 0 6px var(--neon-yellow)" }}>
            THREAT_ANALYSIS — Survival data by occupation collected by the system. Where does yours rank?
          </p>
        </div>

        {/* 랭킹 차트 — 2컬럼 나란히 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <JobRiskRanking data={rankingEndangered} loading={rankingLoading} error={rankingError} title="MOST ENDANGERED" subtitle="Top 5 jobs with fewest years left" variant="endangered" />
          <JobRiskRanking data={rankingSurvived} loading={rankingLoading} error={rankingError} title="MOST SURVIVED" subtitle="Top 5 jobs with most years left" variant="survived" />
        </div>

        {/* 구분선 */}
        <div className="w-full h-px opacity-40" style={{ background: "linear-gradient(to right, transparent, var(--neon-blue), transparent)", boxShadow: "0 0 10px var(--neon-blue)" }} aria-hidden="true" />

        {/* 방명록 섹션 설명 */}
        <div className="text-center">
          <p className="font-[family-name:var(--font-mono)] text-base tracking-wider" style={{ color: "var(--neon-blue)", textShadow: "0 0 6px var(--neon-blue)" }}>
            SIGNAL_ARCHIVE — Last transmissions received from survivors in the ruins
          </p>
        </div>

        {/* 방명록 목록 — 3컬럼 카드 그리드 */}
        <section aria-label="Guestbook entries" className="columns-1 md:columns-2 lg:columns-3 gap-4">
          {entries.length === 0 && !loading && (
            <p className="col-span-full text-center font-[family-name:var(--font-mono)] text-base" style={{ color: "rgba(100,160,200,0.4)" }}>
              No one has left a trace yet...
            </p>
          )}

          {entries.map((entry, idx) => {
            const isLong = entry.message.length > 100;
            const isExpanded = expandedIds.has(entry.entry_id);
            return (
              <article key={entry.entry_id} className="guestbook-entry neon-border-cyan flex flex-col" aria-label={`${entry.job_title}'s guestbook entry`}
                style={{ animationDelay: `${idx * 60}ms`, animation: "fade-in 0.4s ease-out forwards", opacity: 0, breakInside: "avoid", marginBottom: "1rem" }}>
                {/* 상단: 직업 + 남은 수명 */}
                <div className="flex items-baseline justify-between mb-2 shrink-0">
                  <span className="font-[family-name:var(--font-heading)] text-sm tracking-wider neon-text-soft-cyan truncate mr-2">
                    {entry.job_title}
                  </span>
                  <span className="neon-text-soft-red font-[family-name:var(--font-heading)] text-sm shrink-0">
                    {Math.round(Number(entry.remaining_years))}yr
                  </span>
                </div>
                {/* 중간: 메시지 + 스킬 (남은 공간만 사용) */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <div className="mb-2">
                    <p
                      className="font-[family-name:var(--font-mono)] text-sm leading-relaxed"
                      style={{
                        color: "var(--color-text)",
                        display: "-webkit-box",
                        WebkitLineClamp: isExpanded ? 999 : 2,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }}
                    >
                      {entry.message}
                    </p>
                    {isLong && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(entry.entry_id)}
                        className="font-[family-name:var(--font-mono)] text-xs mt-1 hover:underline"
                        style={{ color: "rgba(100,160,200,0.6)" }}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? "▲ Collapse" : "▼ Read more"}
                      </button>
                    )}
                  </div>
                  {/* 스킬 태그 */}
                  {entry.skills && (() => {
                    const skillList = entry.skills.split(",").map((s) => s.trim()).filter(Boolean);
                    const isSkillExpanded = expandedIds.has(`skill-${entry.entry_id}`);
                    const visibleSkills = isSkillExpanded ? skillList : skillList.slice(0, 3);
                    const hasMoreSkills = skillList.length > 3;
                    return (
                      <div className="mt-auto mb-1">
                        <div className="flex flex-wrap gap-1.5">
                          {visibleSkills.map((skill) => (
                            <span key={skill} className="inline-block px-2 py-0.5 text-xs font-[family-name:var(--font-mono)] rounded"
                              style={{
                                background: "rgba(0,255,255,0.08)",
                                border: "1px solid rgba(0,255,255,0.25)",
                                color: "var(--neon-cyan, #00e5ff)",
                                textShadow: "0 0 4px rgba(0,255,255,0.3)",
                              }}>
                              {skill}
                            </span>
                          ))}
                          {hasMoreSkills && !isSkillExpanded && (
                            <button type="button" onClick={() => toggleExpand(`skill-${entry.entry_id}`)}
                              className="inline-block px-2 py-0.5 text-xs font-[family-name:var(--font-mono)] rounded cursor-pointer"
                              style={{ background: "rgba(0,255,255,0.04)", border: "1px solid rgba(0,255,255,0.15)", color: "rgba(100,160,200,0.6)" }}>
                              +{skillList.length - 3}
                            </button>
                          )}
                        </div>
                        {hasMoreSkills && isSkillExpanded && (
                          <button type="button" onClick={() => toggleExpand(`skill-${entry.entry_id}`)}
                            className="font-[family-name:var(--font-mono)] text-xs mt-1 hover:underline"
                            style={{ color: "rgba(100,160,200,0.6)" }}>
                            ▲ Collapse
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {/* 하단: 이모지 + 시간 (절대 잘리지 않음) */}
                <div className="shrink-0 pt-2 flex flex-col gap-1.5">
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Emoji reactions">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => handleReaction(entry.entry_id, emoji, entry.created_at)}
                        disabled={reactingIds.has(entry.entry_id)} className="guestbook-reaction-btn" aria-label={`Add ${emoji} reaction`}>
                        <span>{emoji}</span>
                        {(entry.reactions[emoji] ?? 0) > 0 && (
                          <span className="text-xs" style={{ color: "rgba(100,160,200,0.7)" }}>{entry.reactions[emoji]}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <time dateTime={entry.created_at} className="font-[family-name:var(--font-mono)] text-xs" style={{ color: "rgba(100,160,200,0.5)" }}>
                    {formatRelativeTime(entry.created_at)}
                  </time>
                </div>
              </article>
            );
          })}

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
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
