import { TrendingUp, TrendingDown, Minus, Target, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CreditScore } from "@/lib/mock-data"

interface ScoreInsightsProps {
  score: CreditScore
  eligibility?: "insufficient" | "preliminary" | "official" | null
  monthsCount?: number
  scoreVersion?: number | null
}

const ELIGIBILITY = {
  official: {
    label: "Official GigCredit Score",
    hint: "6+ months of verified work history",
    accent: "bg-success/10 border-success/30 text-success",
    dot: "bg-success",
  },
  preliminary: {
    label: "Preliminary Score",
    hint: "Upload 6+ months to get an official score",
    accent: "bg-warning/10 border-warning/30 text-warning",
    dot: "bg-warning",
  },
  insufficient: {
    label: "Not enough data yet",
    hint: "Need at least 3 months of work data",
    accent: "bg-destructive/10 border-destructive/30 text-destructive",
    dot: "bg-destructive",
  },
}

const RANGE_LABELS: Record<string, string> = {
  Excellent: "800 – 850",
  Good:      "670 – 799",
  Fair:      "500 – 669",
  Poor:      "300 – 499",
}

const NEXT_MILESTONE: Record<string, { target: number; label: string }> = {
  Poor:      { target: 500,  label: "Fair" },
  Fair:      { target: 670,  label: "Good" },
  Good:      { target: 800,  label: "Excellent" },
  Excellent: { target: 850,  label: "Maximum" },
}

export function ScoreInsights({ score, eligibility, monthsCount, scoreVersion }: ScoreInsightsProps) {
  const diff = score.value - score.previousValue
  const absDiff = Math.abs(diff)
  const pctChange = score.previousValue > 0
    ? Math.abs(((diff / score.previousValue) * 100)).toFixed(1)
    : "0.0"

  const eligCfg = eligibility ? ELIGIBILITY[eligibility] : null
  const milestone = NEXT_MILESTONE[score.category]
  const ptsToNext = milestone ? milestone.target - score.value : 0
  const milestoneProgress = milestone
    ? Math.min(Math.max(((score.value - (milestone.target - 200)) / 200) * 100, 2), 100)
    : 0

  return (
    <div className="flex-1 flex flex-col gap-4 w-full min-w-0">

      {/* Eligibility — prominent header block */}
      {eligCfg && (
        <div className={cn("rounded-xl border px-4 py-3", eligCfg.accent)}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn("w-2 h-2 rounded-full shrink-0", eligCfg.dot)} />
            <p className="text-sm font-semibold leading-none">{eligCfg.label}</p>
            {scoreVersion && (
              <span className="ml-auto text-xs opacity-60 tabular-nums">v{scoreVersion}</span>
            )}
          </div>
          <p className="text-xs opacity-70 pl-4 leading-relaxed">{eligCfg.hint}</p>
          {monthsCount !== undefined && (
            <p className="text-xs opacity-55 pl-4 mt-0.5">
              {monthsCount} month{monthsCount !== 1 ? "s" : ""} on record
            </p>
          )}
        </div>
      )}

      {/* Monthly change — large number treatment */}
      <div className="flex items-center gap-4">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
          diff > 0 ? "bg-success/10" : diff < 0 ? "bg-destructive/10" : "bg-muted"
        )}>
          {diff > 0
            ? <TrendingUp className="w-4 h-4 text-success" />
            : diff < 0
            ? <TrendingDown className="w-4 h-4 text-destructive" />
            : <Minus className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Monthly change</p>
          <p className={cn(
            "text-lg font-bold leading-tight",
            diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-foreground"
          )}>
            {diff === 0
              ? "No change"
              : `${diff > 0 ? "+" : "−"}${absDiff} pts`}
          </p>
          {diff !== 0 && (
            <p className="text-xs text-muted-foreground">
              {diff > 0 ? "+" : "−"}{pctChange}% from last score
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Compact details list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Score band</span>
          <span className="text-xs font-medium text-foreground">
            {score.category}
            <span className="text-muted-foreground font-normal ml-1">
              ({RANGE_LABELS[score.category] ?? "—"})
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Scoring model</span>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              {score.modelUsed === "ml" ? "Machine Learning" : "Baseline"}
            </span>
          </div>
        </div>

        {/* Next milestone */}
        {milestone && ptsToNext > 0 && (
          <div className="pt-1">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" />
                Next milestone
              </span>
              <span className="text-xs font-medium text-foreground">
                {milestone.label}
                <span className="text-muted-foreground font-normal ml-1 tabular-nums">
                  — {ptsToNext} pts to go
                </span>
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${milestoneProgress}%` }}
              />
            </div>
          </div>
        )}

        {milestone && ptsToNext <= 0 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3" />
              Milestone
            </span>
            <span className="text-xs font-semibold text-success">Maximum reached</span>
          </div>
        )}
      </div>

    </div>
  )
}
