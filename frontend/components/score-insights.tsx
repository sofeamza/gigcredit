import { TrendingUp, ArrowUpRight, Target, ShieldCheck, Brain } from "lucide-react"
import type { CreditScore } from "@/lib/mock-data"

interface ScoreInsightsProps {
  score: CreditScore
}

export function ScoreInsights({ score }: ScoreInsightsProps) {
  const diff = score.value - score.previousValue
  const percentChange = ((diff / score.previousValue) * 100).toFixed(1)

  const insights = [
    {
      icon: TrendingUp,
      label: "Monthly Change",
      value: `${diff > 0 ? "+" : ""}${diff} pts`,
      sub: `${diff > 0 ? "+" : ""}${percentChange}% from last month`,
      positive: diff > 0,
    },
    {
      icon: ArrowUpRight,
      label: "Score Range",
      value: score.category,
      sub: score.category === "Excellent" ? "800 - 850 range" :
           score.category === "Good" ? "670 - 799 range" :
           score.category === "Fair" ? "500 - 669 range" : "300 - 499 range",
      positive: true,
    },
    {
      icon: score.modelUsed === "ml" ? Brain : ShieldCheck,
      label: "Model Used",
      value: score.modelUsed === "ml" ? "ML (Random Forest)" : "Baseline (Linear)",
      sub: score.safetyTriggered
        ? `Safety triggered (${score.discrepancy}pt gap)`
        : `Discrepancy: ${score.discrepancy}pts`,
      positive: !score.safetyTriggered,
    },
    {
      icon: Target,
      label: "Next Milestone",
      value: score.value >= 800 ? "850" : "800",
      sub: score.value >= 800
        ? `${850 - score.value} pts away from max`
        : `${800 - score.value} pts away from Excellent`,
      positive: true,
    },
  ]

  return (
    <div className="flex-1 space-y-4 w-full">
      {insights.map((insight) => (
        <div
          key={insight.label}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <insight.icon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{insight.label}</p>
            <p className="text-sm font-semibold text-card-foreground">
              {insight.value}
            </p>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {insight.sub}
          </span>
        </div>
      ))}
    </div>
  )
}
