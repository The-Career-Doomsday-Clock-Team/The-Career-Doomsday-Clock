"use client";

/**
 * 직업별 D-Day 랭킹 차트 컴포넌트
 * CSS 기반 수평 바 차트, 디스토피아 테마
 * endangered(위험) / survived(생존) 두 가지 변형 지원
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */

export interface JobRiskData {
  job_title: string;
  avg_remaining_years: number;
  count: number;
}

export interface JobRiskRankingProps {
  data: JobRiskData[];
  loading: boolean;
  error?: boolean;
  title?: string;
  subtitle?: string;
  variant?: "endangered" | "survived";
}

export function JobRiskRanking({
  data,
  loading,
  error,
  title = "GLOBAL JOB RISK RANKING",
  subtitle = "직업별 평균 D-Day",
  variant = "endangered",
}: JobRiskRankingProps) {
  // 에러 시 렌더링하지 않음
  if (error) return null;

  // 로딩 상태
  if (loading) {
    return (
      <section className="dystopia-panel p-6" aria-label={title}>
        <div className="panel-scanlines" />
        <div className="relative z-10">
          <div className="panel-tag mb-3" style={{ animation: "neon-flicker2 2.8s infinite" }}>
            // {title}
          </div>
          <p
            className="text-center font-[family-name:var(--font-mono)] text-sm"
            style={{ color: "rgba(100,160,200,0.5)", animation: "blink 1.8s step-end infinite" }}
          >
            LOADING RANKING DATA...
          </p>
        </div>
      </section>
    );
  }

  // 데이터 없음
  if (data.length === 0) {
    return (
      <section className="dystopia-panel p-6" aria-label={title}>
        <div className="panel-scanlines" />
        <div className="relative z-10">
          <div className="panel-tag mb-3">// {title}</div>
          <p
            className="text-center font-[family-name:var(--font-mono)] text-sm"
            style={{ color: "rgba(100,160,200,0.4)" }}
          >
            아직 충분한 데이터가 수집되지 않았습니다
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="dystopia-panel p-6" aria-label={title}>
      <div className="panel-scanlines" />
      <div className="relative z-10">
        <div className="panel-tag mb-1" style={{ animation: "neon-flicker2 2.8s infinite" }}>
          // {title}
        </div>
        <p
          className="font-[family-name:var(--font-mono)] text-sm mb-4"
          style={{ color: "rgba(100,160,200,0.5)" }}
        >
          {subtitle}
        </p>

        <div className="flex flex-col gap-2.5" role="list" aria-label={`${title} 목록`}>
          {data.map((item, idx) => {
            const barColor = variant === "endangered"
              ? "var(--neon-red)"
              : "var(--neon-blue)";

            return (
              <div key={item.job_title} className="flex items-center gap-3" role="listitem">
                <span
                  className="font-[family-name:var(--font-mono)] text-sm w-5 text-right shrink-0"
                  style={{ color: "rgba(100,160,200,0.5)" }}
                >
                  {idx + 1}
                </span>
                <span
                  className="font-[family-name:var(--font-heading)] text-sm tracking-wider flex-1 truncate"
                  style={{ color: barColor, textShadow: `0 0 4px ${barColor}` }}
                  title={item.job_title}
                >
                  {item.job_title}
                </span>
                <span
                  className="font-[family-name:var(--font-mono)] text-sm w-16 text-right shrink-0"
                  style={{ color: barColor, textShadow: `0 0 4px ${barColor}` }}
                >
                  {item.avg_remaining_years}년
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
