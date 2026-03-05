/**
 * 방명록 관련 데이터 타입 정의
 * 디자인 문서의 API 인터페이스 기반
 */

export interface GuestbookEntry {
  entry_id: string;
  created_at: string;
  job_title: string;
  remaining_years: number;
  message: string;
  skills?: string;  // 쉼표 구분 스킬 문자열 (옵셔널)
  reactions: Record<string, number>;
}

export interface GuestbookListResponse {
  items: GuestbookEntry[];
  last_key: string | null;
}

export interface GuestbookPostRequest {
  session_id: string;
  job_title: string;
  remaining_years: number;
  message: string;
  skills?: string;  // 쉼표 구분 스킬 문자열 (옵셔널)
}

export interface GuestbookPostResponse {
  entry_id: string;
  created_at: string;
}

export interface ReactionResponse {
  reactions: Record<string, number>;
}
