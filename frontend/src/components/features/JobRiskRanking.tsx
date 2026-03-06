"use client";

/**
 * Job D-Day Ranking Chart Component
 * CSS-based horizontal bar chart, dystopia theme
 * Supports endangered / survived variants
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
  subtitle = "Average D-Day by job",
  variant = "endangered",
}: JobRiskRankingProps) {
  // Error: don't render
  if (error) return null;

  // Loading state
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

  // No data
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
            Not enough data collected yet
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

        <div className="flex flex-col gap-2.5" role="list" aria-label={`${title} list`}>
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
                  {item.avg_remaining_years}yr
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
