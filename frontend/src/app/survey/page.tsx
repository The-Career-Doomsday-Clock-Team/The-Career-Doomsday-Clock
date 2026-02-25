"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitSurvey, ApiError } from "@/lib/api";

/**
 * 설문 페이지 — DISTRICT Ω 등록 시스템 스타일
 * Requirements: 2.1, 2.2, 2.3, 3.1
 */

const FIELDS = [
  { key: "name" as const, label: "IDENT_NAME", placeholder: "성명을 입력하라" },
  { key: "job_title" as const, label: "OCCUPATION_CODE", placeholder: "멸망 전 직업명" },
  { key: "strengths" as const, label: "SURVIVAL_SKILLS", placeholder: "생존 기술을 기록하라" },
  { key: "hobbies" as const, label: "ACTIVITY_LOG", placeholder: "폐허에서의 활동을 입력하라" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

interface FormData {
  name: string;
  job_title: string;
  strengths: string;
  hobbies: string;
}

const INITIAL_FORM: FormData = { name: "", job_title: "", strengths: "", hobbies: "" };

export default function SurveyPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleChange = useCallback((key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // 유효성 검증 (Req 2.2, 2.3)
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<FieldKey, string>> = {};
    for (const field of FIELDS) {
      if (!form[field.key].trim()) {
        newErrors[field.key] = `> ${field.label} required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  // 제출 (Req 3.1)
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setApiError(null);
      if (!validate()) return;

      const sessionId = sessionStorage.getItem("session_id");
      if (!sessionId) { router.push("/"); return; }

      setSubmitting(true);
      try {
        await submitSurvey({
          name: form.name,
          job_title: form.job_title,
          strengths: form.strengths,
          hobbies: form.hobbies,
        });
        router.push("/loading-screen");
      } catch (err) {
        if (err instanceof ApiError) setApiError(err.message);
        else setApiError("통신 장애가 발생했습니다. 다시 시도하십시오.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, validate, router]
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="survey-bg" aria-hidden="true" />

      <div className="dystopia-panel relative z-10 w-full max-w-xl p-9 sm:p-10 animate-fade-in" style={{ animation: "fade-in-scale 0.4s ease" }}>
        <div className="panel-scanlines" />

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <div className="panel-tag">// DISTRICT-Ω REGISTRY SYSTEM v2.4.1</div>
            <div className="panel-title mt-1">SURVIVOR_INTAKE</div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xs tracking-widest border border-red-500/50 text-red-400 px-3 py-1 hover:bg-red-500/15 transition-all"
            style={{ fontFamily: "var(--font-mono)", textShadow: "0 0 6px var(--neon-red)" }}
            aria-label="뒤로가기"
          >
            [ ESC ]
          </button>
        </div>
        <div className="panel-divider mb-7" />

        {/* 폼 (Req 2.1) */}
        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            {FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label htmlFor={field.key} className="dystopia-label">
                  {field.label}
                </label>
                <input
                  id={field.key}
                  type="text"
                  value={form[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`dystopia-input ${errors[field.key] ? "dystopia-input-error" : ""}`}
                  aria-invalid={!!errors[field.key]}
                  aria-describedby={errors[field.key] ? `${field.key}-error` : undefined}
                  disabled={submitting}
                />
                {errors[field.key] && (
                  <p id={`${field.key}-error`} className="dystopia-error" role="alert">
                    {errors[field.key]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {apiError && (
            <p className="dystopia-error text-center mt-4" role="alert">⚠ {apiError}</p>
          )}

          <div className="flex justify-end gap-3 mt-7">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-xs tracking-widest border border-gray-600/30 text-gray-500 px-5 py-3 hover:border-red-500/50 hover:text-red-400 transition-all"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              ABORT
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="neon-button disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="설문 제출"
            >
              {submitting ? "PROCESSING…" : "SUBMIT ▶"}
            </button>
          </div>
        </form>

        {/* 하단 프로그레스 바 */}
        <div className="progress-bar" style={{ width: "100%" }} />
      </div>
    </main>
  );
}
