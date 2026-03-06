"use client";

import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitSurvey, ApiError } from "@/lib/api";
import { TagInput, serializeTags } from "@/components/ui/TagInput";

/**
 * Survey Page — DISTRICT Ω Registration System Style
 * Requirements: 2.1, 2.2, 2.3, 3.1
 */

const AGE_GROUPS = ["Teens", "20s", "30s", "40s", "50+"] as const;
interface FormData {
  name: string;
  job_title: string;
  age_group: string;
  skills: string[];
}

/** Text field keys (excluding skills) */
type TextFieldKey = "name" | "job_title" | "age_group";
type FieldKey = keyof FormData;

const INITIAL_FORM: FormData = {
  name: "",
  job_title: "",
  age_group: "",
  skills: [],
};

const REQUIRED_TEXT_FIELDS: TextFieldKey[] = ["name", "job_title", "age_group"];

export default function SurveyPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Redirect to main page if no session ID
  useEffect(() => {
    const sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      router.push("/");
    }
  }, [router]);

  const handleChange = useCallback((key: TextFieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSkillsChange = useCallback((tags: string[]) => {
    setForm((prev) => ({ ...prev, skills: tags }));
    setErrors((prev) => {
      if (!prev.skills) return prev;
      const next = { ...prev };
      delete next.skills;
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<FieldKey, string>> = {};
    for (const key of REQUIRED_TEXT_FIELDS) {
      if (!form[key].trim()) {
        newErrors[key] = "> REQUIRED_FIELD";
      }
    }
    if (form.skills.length === 0) {
      newErrors.skills = "> REQUIRED_FIELD";
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

      // Save survey data for retry
      sessionStorage.setItem("survey_form", JSON.stringify(form));

      setSubmitting(true);
      try {
        const skillsStr = serializeTags(form.skills);
        await submitSurvey({
          name: form.name,
          job_title: form.job_title,
          age_group: form.age_group,
          strengths: skillsStr,
          hobbies: skillsStr,
        });
        router.push("/loading-screen");
      } catch (err) {
        if (err instanceof ApiError) setApiError(err.message);
        else setApiError("COMMUNICATION_FAILURE — Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, validate, router]
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
      <div className="survey-bg" aria-hidden="true" />

      <div className="dystopia-panel relative z-10 w-full max-w-4xl p-10 sm:p-16 animate-fade-in" style={{ animation: "fade-in-scale 0.4s ease" }}>
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
            aria-label="Go back"
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
              <label htmlFor="name" className="dystopia-label">IDENT_NAME // Name</label>
              <input
                id="name" type="text" value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter your name"
                className={`dystopia-input ${errors.name ? "dystopia-input-error" : ""}`}
                disabled={submitting}
              />
              {errors.name && <p className="dystopia-error" role="alert">{errors.name}</p>}
            </div>

            {/* 직업 */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="job_title" className="dystopia-label">OCCUPATION // Job Title</label>
              <input
                id="job_title" type="text" value={form.job_title}
                onChange={(e) => handleChange("job_title", e.target.value)}
                placeholder="e.g. Developer, Student, Freelancer"
                className={`dystopia-input ${errors.job_title ? "dystopia-input-error" : ""}`}
                disabled={submitting}
              />
              {errors.job_title && <p className="dystopia-error" role="alert">{errors.job_title}</p>}
            </div>

            {/* 연령대 */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="age_group" className="dystopia-label">AGE_GROUP // Age Group</label>
              <select
                id="age_group" value={form.age_group}
                onChange={(e) => handleChange("age_group", e.target.value)}
                className={`dystopia-select ${errors.age_group ? "dystopia-input-error" : ""}`}
                disabled={submitting}
              >
                <option value="">Select your age group</option>
                {AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              {errors.age_group && <p className="dystopia-error" role="alert">{errors.age_group}</p>}
            </div>

            {/* 보유 스킬 - 전체 너비 */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="skills" className="dystopia-label">SKILLS // Your Skills</label>
              <TagInput
                id="skills"
                tags={form.skills}
                onChange={handleSkillsChange}
                placeholder="e.g. Python, Data Analysis, UX Design (Press Enter to add)"
                disabled={submitting}
                error={errors.skills}
              />
            </div>
          </div>

          {apiError && (
            <p className="dystopia-error text-center mt-5" role="alert">⚠ {apiError}</p>
          )}

          {/* 입력 안내 */}
          <p className="text-left mt-6 text-sm tracking-wider" style={{ color: "rgba(100,180,220,0.7)" }}>
            💡 Press Enter to add a skill tag.
          </p>
          <p className="text-left mt-1 text-sm tracking-wider" style={{ color: "rgba(100,180,220,0.7)" }}>
            📋 Paste comma-separated skills to auto-generate tags.
          </p>
          <p className="text-left mt-2 text-sm tracking-wider" style={{ color: "rgba(100,180,220,0.7)" }}>
            🔒 Your name and age group are not stored. Only job title and skills are saved as anonymous data.
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
              aria-label="Submit survey"
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
