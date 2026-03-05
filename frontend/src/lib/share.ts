/**
 * 공유하기 유틸리티
 * 결과 요약 텍스트 생성 + 클립보드 복사
 * Requirements: 5.1, 5.2, 5.3
 */

import type { ResultData } from "@/types/result";

/**
 * 결과 데이터로부터 공유용 텍스트를 생성
 * 직업명, D-Day, D-Day 사유, 스킬 위험도를 포함
 */
export function generateShareText(
  result: ResultData,
  jobTitle?: string
): string {
  const lines: string[] = [
    "🔥 커리어 종말 시계 결과",
    `직업: ${jobTitle || "N/A"}`,
    `D-Day: ${result.dday ?? 0}년`,
  ];

  if (result.dday_reason) {
    lines.push(result.dday_reason);
  }

  if (result.skill_risks && result.skill_risks.length > 0) {
    lines.push("");
    lines.push("스킬 위험도:");
    for (const risk of result.skill_risks) {
      lines.push(`- ${risk.skill_name}: ${risk.replacement_prob}%`);
    }
  }

  lines.push("");
  lines.push("Career Doomsday Clock에서 확인하세요!");

  return lines.join("\n");
}

/**
 * 텍스트를 클립보드에 복사
 * @returns true: 복사 성공, false: Clipboard API 미지원
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}
