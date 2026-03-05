"use client";

import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitSurvey, ApiError } from "@/lib/api";

/**
 * 설문 페이지 — DISTRICT Ω 등록 시스템 스타일
 * Requirements: 2.1, 2.2, 2.3, 3.1
 */

const AGE_GROUPS = ["10대", "20대", "30대", "40대", "50대 이상"] as const;
interface FormData {
  name: string;
  job_title: string;
  age_group: string;
  skills: string;
}

type FieldKey = keyof FormData;

const INITIAL_FORM: FormData = {
  name: "",
  job_title: "",
  age_group: "",
  skills: "",
};

const REQUIRED_FIELDS: FieldKey[] = ["name", "job_title", "age_group", "skills"];

export default function SurveyPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // 세션 ID가 없으면 메인 페이지로 리다이렉트
  useEffect(() => {
    const sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      router.push("/");
    }
  }, [router]);

  const handleChange = useCallback((key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<FieldKey, string>> = {};
    for (const key of REQUIRED_FIELDS) {
      if (!form[key].trim()) {
        newErrors[key] = "> 필수 항목입니다";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setApiError(null);
      if (!validate()) return;

      const sessionId = sessionStorage.getItem("session_id");
      if (!sessionId) { router.push("/"); return; }

      // 재시도를 위해 설문 데이터 보관
      sessionStorage.setItem("survey_form", JSON.stringify(form));

      setSubmitting(true);
      try {
        await submitSurvey({
          name: form.name,
          job_title: form.job_title,
          age_group: form.age_group,
          strengths: form.skills,
          hobbies: form.skills,
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
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
      <div className="survey-bg" aria-hidden="true" />

      <div className="dystopia-panel relative z-10 w-full max-w-3xl p-10 sm:p-16 animate-fade-in" style={{ animation: "fade-in-scale 0.4s ease" }}>
        <div className="panel-scanlines" />

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-8">
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
        <div className="panel-divider mb-8" />

        {/* 폼 */}
        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
            {/* 이름 */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="dystopia-label">IDENT_NAME // 이름</label>
              <input
                id="name" type="text" value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="성명을 입력하라"
                className={`dystopia-input ${errors.name ? "dystopia-input-error" : ""}`}
                disabled={submitting}
              />
              {errors.name && <p className="dystopia-error" role="alert">{errors.name}</p>}
            </div>

            {/* 직업 */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="job_title" className="dystopia-label">OCCUPATION // 직업</label>
              <input
                id="job_title" type="text" value={form.job_title}
                onChange={(e) => handleChange("job_title", e.target.value)}
                placeholder="예: 개발자, 학생, N잡러, 무직"
                className={`dystopia-input ${errors.job_title ? "dystopia-input-error" : ""}`}
                disabled={submitting}
              />
              {errors.job_title && <p className="dystopia-error" role="alert">{errors.job_title}</p>}
            </div>

            {/* 연령대 */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="age_group" className="dystopia-label">AGE_GROUP // 연령대</label>
              <select
                id="age_group" value={form.age_group}
                onChange={(e) => handleChange("age_group", e.target.value)}
                className={`dystopia-select ${errors.age_group ? "dystopia-input-error" : ""}`}
                disabled={submitting}
              >
                <option value="">연령대를 선택하라</option>
                {AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              {errors.age_group && <p className="dystopia-error" role="alert">{errors.age_group}</p>}
            </div>

            {/* 보유 스킬 - 전체 너비 */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="skills" className="dystopia-label">SKILLS // 보유 스킬</label>
              <input
                id="skills" type="text" value={form.skills}
                onChange={(e) => handleChange("skills", e.target.value)}
                placeholder="예: Python, 데이터 분석, 프로젝트 관리, UX 디자인"
                className={`dystopia-input ${errors.skills ? "dystopia-input-error" : ""}`}
                disabled={submitting}
              />
              {errors.skills && <p className="dystopia-error" role="alert">{errors.skills}</p>}
            </div>
          </div>

          {apiError && (
            <p className="dystopia-error text-center mt-5" role="alert">⚠ {apiError}</p>
          )}

          {/* 입력 안내 */}
          <p className="text-center mt-6 text-xs tracking-wider" style={{ color: "rgba(100,180,220,0.8)" }}>
            💡 직업과 보유 스킬은 여러 개일 경우 쉼표(,)로 구분하여 입력하세요
          </p>

          {/* 개인정보 안내 */}
          <p className="text-center mt-2 text-xs tracking-wider" style={{ color: "rgba(150,200,230,1)" }}>
            🔒 입력된 정보는 분석 목적으로만 사용되며, 세션 종료 시 자동 삭제됩니다
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-xs tracking-widest border border-gray-600/30 text-gray-500 px-5 py-3 hover:border-red-500/50 hover:text-red-400 transition-all"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              ABORT
            </button>
            <button
              type="submit" disabled={submitting}
              className="neon-button disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="설문 제출"
            >
              {submitting ? "PROCESSING…" : "SUBMIT ▶"}
            </button>
          </div>
        </form>

        <div className="progress-bar" style={{ width: "100%" }} />
      </div>
    </main>
  );
}
