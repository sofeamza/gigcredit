"use client"

import { useState } from "react"
import { ChevronDown, Lightbulb, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ScoreFactor } from "@/lib/mock-data"

interface FactorCardProps {
  factor: ScoreFactor
}

const FACTOR_ICONS: Record<string, string> = {
  task_completion_rate: "✅",
  gps_consistency: "📍",
  customer_rating: "⭐",
  platform_diversity: "🔗",
}

const FACTOR_SUBLABELS: Record<string, string> = {
  task_completion_rate: "How reliably you complete accepted tasks",
  gps_consistency: "How consistent your routes and movement are",
  customer_rating: "Average rating given by your customers",
  platform_diversity: "Number of gig platforms you work on",
}

export function FactorCard({ factor }: FactorCardProps) {
  const [expanded, setExpanded] = useState(false)

  const isPositive = factor.impact === "positive"
  const barWidth = Math.max(factor.normalizedValue * 100, 4)

  const displayValue =
    factor.key === "customer_rating"
      ? `${factor.value.toFixed(1)} / 5.0`
      : factor.key === "platform_diversity"
      ? `${factor.value} platform${factor.value !== 1 ? "s" : ""}`
      : `${factor.value.toFixed(0)}%`

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 text-left"
        aria-expanded={expanded}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl leading-none">{FACTOR_ICONS[factor.key] ?? "📊"}</span>
            <div>
              <p className="text-sm font-semibold text-card-foreground leading-none mb-0.5">
                {factor.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {FACTOR_SUBLABELS[factor.key]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
                isPositive
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {isPositive
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />}
              {isPositive ? "+" : ""}{factor.shapValue} pts
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
          </div>
        </div>

        {/* Progress bar + value */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Your value: <span className="font-medium text-card-foreground">{displayValue}</span></span>
            <span>Weight: {(factor.weight * 100).toFixed(0)}% of score</span>
          </div>
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                isPositive ? "bg-success" : "bg-destructive"
              )}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-border pt-4 space-y-3">
          <p className="text-sm text-card-foreground leading-relaxed">
            {factor.description}
          </p>
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-primary/5 border border-primary/10">
            <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary mb-0.5 uppercase tracking-wide">
                Tip
              </p>
              <p className="text-sm text-card-foreground/80 leading-relaxed">
                {factor.advice}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
