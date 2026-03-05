"use client";

import { useState, useCallback, useRef, type KeyboardEvent, type ChangeEvent } from "react";

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  maxTags?: number;
  id?: string;
}

/**
 * 태그 로직: 추가/삭제/중복방지/공백방지
 * UI와 분리하여 테스트 가능하도록 export
 */
export function addTag(tags: string[], raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return tags; // 공백 태그 방지
  const isDuplicate = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
  if (isDuplicate) return tags; // 중복 방지 (대소문자 무시)
  return [...tags, trimmed];
}

export function removeTag(tags: string[], index: number): string[] {
  if (index < 0 || index >= tags.length) return tags;
  return tags.filter((_, i) => i !== index);
}

export function removeLastTag(tags: string[]): string[] {
  if (tags.length === 0) return tags;
  return tags.slice(0, -1);
}

/**
 * 직렬화: 태그 배열 ↔ 쉼표 구분 문자열
 */
export function serializeTags(tags: string[]): string {
  return tags.join(",");
}

export function deserializeTags(str: string): string[] {
  if (!str) return [];
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * TagInput UI 컴포넌트
 * - Enter/쉼표 입력 시 태그 추가
 * - X 버튼 클릭 시 삭제
 * - Backspace 시 마지막 태그 삭제
 * - 중복 방지 (대소문자 무시), 공백 태그 방지
 * - 디스토피아 테마 스타일링 (네온 시안 태그 배지)
 */
export function TagInput({
  tags,
  onChange,
  placeholder = "스킬을 입력하고 Enter",
  disabled = false,
  error,
  maxTags,
  id,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = useCallback(
    (raw: string) => {
      if (maxTags && tags.length >= maxTags) return;
      const next = addTag(tags, raw);
      if (next !== tags) {
        onChange(next);
      }
      setInput("");
    },
    [tags, onChange, maxTags],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // 한국어 IME 조합 중이면 태그 추가하지 않음
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        e.stopPropagation();
        handleAdd(input);
      } else if (e.key === "Backspace" && input === "") {
        const next = removeLastTag(tags);
        if (next !== tags) onChange(next);
      }
    },
    [input, tags, onChange, handleAdd],
  );

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // 쉼표가 포함되면 쉼표 앞까지를 태그로 추가
    if (val.includes(",")) {
      const parts = val.split(",");
      // 마지막 부분은 아직 입력 중
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i].trim();
        if (part) handleAdd(part);
      }
      setInput(parts[parts.length - 1]);
    } else {
      setInput(val);
    }
  }, [handleAdd]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(removeTag(tags, index));
      inputRef.current?.focus();
    },
    [tags, onChange],
  );

  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div>
      <div
        className={`dystopia-input flex flex-wrap items-center gap-1.5 cursor-text min-h-[46px] ${
          error ? "dystopia-input-error" : ""
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        style={{ padding: "8px 10px" }}
        onClick={handleContainerClick}
        role="group"
        aria-label="태그 입력"
      >
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-sm tracking-wider rounded-sm"
            style={{
              background: "rgba(0,207,255,0.12)",
              border: "1px solid rgba(0,207,255,0.4)",
              color: "var(--neon-blue)",
              textShadow: "0 0 4px rgba(0,207,255,0.5)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(i);
                }}
                className="ml-0.5 hover:text-white transition-colors"
                style={{ lineHeight: 1, fontSize: "0.8rem" }}
                aria-label={`${tag} 태그 삭제`}
              >
                ✕
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          disabled={disabled}
          className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-[#c8f0ff] placeholder:text-[rgba(100,160,200,0.35)]"
          style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", padding: 0 }}
          autoComplete="off"
        />
      </div>
      {error && (
        <p className="dystopia-error mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
