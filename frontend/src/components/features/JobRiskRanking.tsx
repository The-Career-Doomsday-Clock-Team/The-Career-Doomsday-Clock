"use client";

/**
 * 직업별 D-Day 랭킹 차트 컴포넌트
 * CSS 기반 수평 바 차트, 디스토피아 테마
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */

export interface JobRiskData {
  job_title: string;
  avg_dday: number;
  count: number;
}

interface JobRiskRankingProps {
  data: JobRiskData[];
  loading: boolean;
  error?: boolean;
}

// 최대 표시 직업 수
const MAX_DISPLAY = 15;

export function JobRiskRanking({ data, loading, error }: JobRiskRankingProps) {
  // 에러 시 렌더링하지 않음 (Requirements 3.5)
  if (error) return null;

  // 로딩 상태 (Requirements 3.4)
  if (loading) {
    return (
      <section className="dystopia-panel p-6" aria-label="직업별 위험도 랭킹">
        <div className="panel-scanlines" />
        <div className="relative z-10">
          <div className="panel-tag mb-3" style={{ animation: "neon-flicker2 2.8s infinite" }}>
            // GLOBAL JOB RISK RANKING
          </div>
          <p
            className="text-center font-[family-name:var(--font-mono)] text-xs"
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
      <section className="dystopia-panel p-6" aria-label="직업별 위험도 랭킹">
        <div className="panel-scanlines" />
        <div className="relative z-10">
          <div className="panel-tag mb-3">// GLOBAL JOB RISK RANKING</div>
          <p
            className="text-center font-[family-name:var(--font-mono)] text-xs"
            style={{ color: "rgba(100,160,200,0.4)" }}
          >
            아직 충분한 데이터가 수집되지 않았습니다
          </p>
        </div>
      </section>
    );
  }

  const displayData = data.slice(0, MAX_DISPLAY);
  // 바 차트 최대값 (가장 큰 avg_dday 기준)
  const maxDday = Math.max(...displayData.map((d) => d.avg_dday), 1);

  return (
    <section className="dystopia-panel p-6" aria-label="직업별 위험도 랭킹">
      <div className="panel-scanlines" />
      <div className="relative z-10">
        <div className="panel-tag mb-1" style={{ animation: "neon-flicker2 2.8s infinite" }}>
          // GLOBAL JOB RISK RANKING
        </div>
        <p
          className="font-[family-name:var(--font-mono)] text-xs mb-4"
          style={{ color: "rgba(100,160,200,0.5)" }}
        >
          직업별 평균 D-Day (위험도 높은 순)
        </p>

        <div className="flex flex-col gap-2.5" role="list" aria-label="직업별 D-Day 랭킹 목록">
          {displayData.map((item, idx) => {
            const barWidth = Math.max((item.avg_dday / maxDday) * 100, 8);
            // 위험도에 따른 색상 (낮을수록 빨강, 높을수록 시안)
            const ratio = item.avg_dday / maxDday;
            const barColor = ratio < 0.4
              ? "var(--neon-red)"
              : ratio < 0.7
                ? "var(--neon-yellow)"
                : "var(--neon-blue)";

            return (
              <div key={item.job_title} className="flex items-center gap-3" role="listitem">
                {/* 순위 */}
                <span
                  className="font-[family-name:var(--font-mono)] text-xs w-5 text-right shrink-0"
                  style={{ color: "rgba(100,160,200,0.5)" }}
                >
                  {idx + 1}
                </span>

                {/* 직업명 */}
                <span
                  className="font-[family-name:var(--font-heading)] text-xs tracking-wider w-24 shrink-0 truncate"
                  style={{ color: barColor, textShadow: `0 0 4px ${barColor}` }}
                  title={item.job_title}
                >
                  {item.job_title}
                </span>

                {/* 바 차트 */}
                <div className="flex-1 h-4 relative" style={{ background: "rgba(0,15,25,0.6)", borderRadius: "2px" }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      background: `linear-gradient(90deg, ${barColor}33, ${barColor}88)`,
                      borderRadius: "2px",
                      boxShadow: `0 0 8px ${barColor}44`,
                    }}
                  />
                </div>

                {/* D-Day 값 */}
                <span
                  className="font-[family-name:var(--font-mono)] text-xs w-16 text-right shrink-0"
                  style={{ color: barColor, textShadow: `0 0 4px ${barColor}` }}
                >
                  D-{item.avg_dday}
                </span>

                {/* 제출 수 */}
                <span
                  className="font-[family-name:var(--font-mono)] text-xs w-8 text-right shrink-0"
                  style={{ color: "rgba(100,160,200,0.4)" }}
                >
                  ({item.count})
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
