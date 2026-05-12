"use client"

import { useState } from "react"
import {
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
  Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ScoreFactor } from "@/lib/mock-data"

interface FactorCardProps {
  factor: ScoreFactor
}

export function FactorCard({ factor }: FactorCardProps) {
  const [expanded, setExpanded] = useState(false)

  const impactConfig = {
    positive: {
      icon: CheckCircle2,
      barColor: "bg-success",
      tagColor: "bg-success/10 text-success",
      label: "Positive Impact",
    },
    neutral: {
      icon: MinusCircle,
      barColor: "bg-warning",
      tagColor: "bg-warning/10 text-warning-foreground",
      label: "Neutral",
    },
    negative: {
      icon: AlertCircle,
      barColor: "bg-destructive",
      tagColor: "bg-destructive/10 text-destructive",
      label: "Needs Improvement",
    },
  }

  const config = impactConfig[factor.impact]
  const Icon = config.icon
  const barWidth = Math.max(factor.normalizedValue * 100, 8)

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-sm"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-4 w-full px-4 py-3.5 text-left"
        aria-expanded={expanded}
      >
        <Icon className="w-5 h-5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-sm font-medium text-card-foreground truncate">
              {factor.name}
            </span>
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full shrink-0", config.tagColor)}>
              {factor.shapValue > 0 ? "+" : ""}
              {factor.shapValue} pts
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", config.barColor)}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border">
          <div className="pt-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Details
              </p>
              <p className="text-sm text-card-foreground leading-relaxed">
                {factor.description}
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent">
              <Lightbulb className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-accent-foreground mb-0.5">
                  Advice
                </p>
                <p className="text-sm text-accent-foreground/80 leading-relaxed">
                  {factor.advice}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Weight: {(factor.weight * 100).toFixed(0)}%
              </span>
              <span>
                Value: {factor.key === "customer_rating" ? `${factor.value}/5.0` : `${factor.value}%`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
