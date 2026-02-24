"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitSurvey, ApiError } from "@/lib/api";

/**
 * 설문 페이지 — 디스토피아 어조 설문 폼
 * Requirements: 2.1, 2.2, 2.3, 3.1
 */

// 설문 필드 정의
const FIELDS = [
  {
    key: "name" as const,
    label: "당신의 정체를 밝혀라",
    placeholder: "이름을 입력하라",
  },
  {
    key: "job_title" as const,
    label: "멸망 전 당신의 직업은 무엇이었나",
    placeholder: "직업명을 입력하라",
  },
  {
    key: "strengths" as const,
    label: "생존 기술을 입력하라",
    placeholder: "당신의 장점을 기록하라",
  },
  {
    key: "hobbies" as const,
    label: "폐허에서 당신은 무엇을 하며 버텼나",
    placeholder: "취미를 입력하라",
  },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

interface FormData {
  name: string;
  job_title: string;
  strengths: string;
  hobbies: string;
}

const INITIAL_FORM: FormData = {
  name: "",
  job_title: "",
  strengths: "",
  hobbies: "",
};

export default function SurveyPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // 필드 변경 핸들러
  const handleChange = useCallback((key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // 입력 시 해당 필드 에러 제거
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // 클라이언트 측 유효성 검증 (Req 2.2, 2.3)
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<FieldKey, string>> = {};
    for (const field of FIELDS) {
      if (!form[field.key].trim()) {
        newErrors[field.key] = "이 항목은 필수입니다. 입력하십시오.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  // 제출 핸들러 (Req 3.1)
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setApiError(null);

      if (!validate()) return;

      const sessionId = sessionStorage.getItem("session_id");
      if (!sessionId) {
        // 세션 ID 없으면 랜딩으로 리다이렉트
        router.push("/");
        return;
      }

      setSubmitting(true);
      try {
        await submitSurvey({
          name: form.name,
          job_title: form.job_title,
          strengths: form.strengths,
          hobbies: form.hobbies,
        });

        // 분석 로딩 화면으로 이동
        router.push("/loading-screen");
      } catch (err) {
        if (err instanceof ApiError) {
          setApiError(err.message);
        } else {
          setApiError("통신 장애가 발생했습니다. 다시 시도하십시오.");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [form, validate, router]
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      {/* 배경 */}
      <div className="survey-bg" aria-hidden="true" />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative z-10 flex w-full max-w-lg flex-col gap-8"
      >
        {/* 제목 */}
        <div className="text-center">
          <h1 className="neon-text-magenta font-[family-name:var(--font-heading)] text-2xl tracking-wider sm:text-3xl">
            생존자 심문 기록
          </h1>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-xs tracking-wide text-[var(--color-text-muted)] sm:text-sm">
            모든 항목에 성실히 응답하라. 거짓은 허용되지 않는다.
          </p>
        </div>

        {/* 입력 필드 (Req 2.1) */}
        {FIELDS.map((field) => (
          <fieldset key={field.key} className="flex flex-col gap-1">
            <label
              htmlFor={field.key}
              className="font-[family-name:var(--font-heading)] text-xs tracking-widest text-[var(--color-cyan)] uppercase"
            >
              {field.label}
            </label>
            <input
              id={field.key}
              type="text"
              value={form[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={`survey-input ${errors[field.key] ? "survey-input-error" : ""}`}
              aria-invalid={!!errors[field.key]}
              aria-describedby={
                errors[field.key] ? `${field.key}-error` : undefined
              }
              disabled={submitting}
              autoComplete="off"
            />
            {errors[field.key] && (
              <p id={`${field.key}-error`} className="survey-error-text" role="alert">
                {errors[field.key]}
              </p>
            )}
          </fieldset>
        ))}

        {/* API 에러 메시지 */}
        {apiError && (
          <p className="survey-error-text text-center" role="alert">
            ⚠ {apiError}
          </p>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={submitting}
          className="neon-button mx-auto mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="설문 제출"
        >
          {submitting ? "전송 중..." : "운명을 확인하라"}
        </button>
      </form>
    </main>
  );
}
