/**
 * API 클라이언트 — 모든 백엔드 API 호출을 중앙 관리
 * Requirements: 3.1, 7.1, 8.1, 8.2, 8.3
 */

import type { ResultData } from "@/types/result";
import type {
  GuestbookListResponse,
  GuestbookPostResponse,
  ReactionResponse,
} from "@/types/guestbook";

// 환경 변수 기반 API 엔드포인트 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// 최대 재시도 횟수
const MAX_RETRIES = 2;
// 재시도 간 대기 시간 (ms)
const RETRY_DELAY_MS = 1000;

/** API 에러 클래스 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** sessionStorage에서 세션 ID를 가져온다 */
function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("session_id");
}

/** 지정된 ms만큼 대기 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 재시도 로직이 포함된 fetch 래퍼
 * - 5xx 에러 또는 네트워크 오류 시 재시도
 * - 4xx 에러는 재시도하지 않음
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);

      // 4xx 에러는 재시도하지 않고 즉시 반환
      if (res.status >= 400 && res.status < 500) {
        return res;
      }

      // 성공 또는 2xx/3xx 응답
      if (res.ok || res.status === 202) {
        return res;
      }

      // 5xx 에러 — 재시도 대상
      lastError = new Error(`서버 오류 (${res.status})`);
    } catch (err) {
      // 네트워크 오류 — 재시도 대상
      lastError = err instanceof Error ? err : new Error("네트워크 오류");
    }

    // 마지막 시도가 아니면 대기 후 재시도
    if (attempt < retries) {
      await delay(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError ?? new Error("요청 실패");
}

/**
 * JSON 응답 파싱 + 에러 처리 공통 로직
 */
async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok && res.status !== 202) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      body?.error ?? `요청 실패 (${res.status})`,
      body?.details
    );
  }
  return res.json() as Promise<T>;
}

// ── 설문 API (Req 3.1) ──

export interface SurveyPayload {
  name: string;
  job_title: string;
  strengths: string;
  hobbies: string;
}

export interface SurveyResponse {
  session_id: string;
  status: string;
}

/** POST /survey — 설문 제출 */
export async function submitSurvey(
  data: SurveyPayload
): Promise<SurveyResponse> {
  const sessionId = getSessionId();
  if (!sessionId) {
    throw new ApiError(401, "세션 ID가 없습니다. 랜딩 페이지에서 시작하십시오.");
  }

  const res = await fetchWithRetry(`${API_BASE_URL}/survey`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      name: data.name.trim(),
      job_title: data.job_title.trim(),
      strengths: data.strengths.trim(),
      hobbies: data.hobbies.trim(),
    }),
  });

  return parseResponse<SurveyResponse>(res);
}

// ── 결과 조회 API (Req 7.1) ──

/** GET /result/{sid} — 분석 결과 조회 */
export async function fetchResult(): Promise<ResultData> {
  const sessionId = getSessionId();
  if (!sessionId) {
    throw new ApiError(401, "세션 ID가 없습니다.");
  }

  const res = await fetchWithRetry(`${API_BASE_URL}/result/${sessionId}`, {
    method: "GET",
  });

  return parseResponse<ResultData>(res);
}

// ── 방명록 API (Req 8.1, 8.2, 8.3) ──

export interface GuestbookPostPayload {
  job_title: string;
  dday: number;
  message: string;
}

/** POST /guestbook — 방명록 등록 (Req 8.1) */
export async function postGuestbook(
  data: GuestbookPostPayload
): Promise<GuestbookPostResponse> {
  const sessionId = getSessionId() ?? "";

  const res = await fetchWithRetry(`${API_BASE_URL}/guestbook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      job_title: data.job_title.trim(),
      dday: data.dday,
      message: data.message.trim(),
    }),
  });

  return parseResponse<GuestbookPostResponse>(res);
}

/** GET /guestbook — 방명록 목록 조회 (Req 8.2) */
export async function fetchGuestbook(
  limit = 20,
  lastKey: string | null = null
): Promise<GuestbookListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (lastKey) params.set("last_key", lastKey);

  const res = await fetchWithRetry(
    `${API_BASE_URL}/guestbook?${params.toString()}`,
    { method: "GET" }
  );

  return parseResponse<GuestbookListResponse>(res);
}

/** POST /guestbook/{id}/reaction — 이모지 반응 추가 (Req 8.3) */
export async function addReaction(
  entryId: string,
  emoji: string
): Promise<ReactionResponse> {
  const res = await fetchWithRetry(
    `${API_BASE_URL}/guestbook/${entryId}/reaction`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    }
  );

  return parseResponse<ReactionResponse>(res);
}
