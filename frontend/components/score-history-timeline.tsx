"use client"

import { useState } from "react"
import { ChevronDown, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimelineEntry {
  created_at: string
  data_period?: string  // "YYYY-MM" — the latest month of data this score covers
  score_value: number
  previousScore: number | null
  eligibility: "insufficient" | "preliminary" | "official"
  months_count: number
  explanation: string[]
  model_used: string
}

const ELIGIBILITY_LABEL: Record<string, { label: string; color: string; dot: string }> = {
  insufficient: { label: "Not enough data", color: "text-destructive", dot: "bg-destructive" },
  preliminary:  { label: "Preliminary Score", color: "text-warning", dot: "bg-warning" },
  official:     { label: "Official Score", color: "text-success", dot: "bg-success" },
}

const FACTOR_LABELS: Record<string, string> = {
  task_completion_rate: "Task Completion Rate",
  gps_consistency: "GPS Consistency",
  customer_rating: "Customer Rating",
  platform_diversity: "Platform Diversity",
}

function humanizeExplanation(line: string): string {
  const match = line.match(/^(\S+)\s+(increased|decreased)\s+your score by ([\d.]+) points/)
  if (!match) return line
  const [, key, direction, pts] = match
  const label = FACTOR_LABELS[key] ?? key.replace(/_/g, " ")
  return `${label} ${direction} your score by ${pts} points`
}

function TimelineRow({ entry, isLatest }: { entry: TimelineEntry; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(isLatest)
  const elig = ELIGIBILITY_LABEL[entry.eligibility] ?? ELIGIBILITY_LABEL.insufficient

  const diff = entry.previousScore != null ? entry.score_value - entry.previousScore : null
  const date = entry.data_period
    ? new Date(entry.data_period + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  return (
    <div className="relative pl-8">
      {/* Timeline dot + line */}
      <div className={cn("absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-card", elig.dot)} />
      <div className="absolute left-[5px] top-4 bottom-0 w-px bg-border" />

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left pb-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-card-foreground">{entry.score_value}</span>
              {diff !== null && diff !== 0 && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium",
                  diff > 0 ? "text-success" : "text-destructive"
                )}>
                  {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {diff > 0 ? "+" : ""}{diff}
                </span>
              )}
              {diff === 0 && (
                <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Minus className="w-3 h-3" /> no change
                </span>
              )}
              <span className={cn("text-xs font-medium", elig.color)}>· {elig.label}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{date} · {entry.months_count} month{entry.months_count !== 1 ? "s" : ""} of data</p>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", expanded && "rotate-180")} />
        </div>

        {expanded && (
          <div className="mt-3 rounded-lg bg-muted/50 border border-border p-3.5 space-y-2">
            <p className="text-xs font-medium text-card-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Why your score is {entry.score_value}
            </p>
            <div className="space-y-1">
              {entry.explanation.map((line, i) => (
                <p key={i} className="text-xs text-muted-foreground leading-relaxed">• {humanizeExplanation(line)}</p>
              ))}
            </div>
          </div>
        )}
      </button>
    </div>
  )
}

export function ScoreHistoryTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No score history yet — your first calculation will appear here.
      </p>
    )
  }

  return (
    <div>
      {entries.map((entry, i) => (
        <TimelineRow key={entry.data_period ?? entry.created_at} entry={entry} isLatest={i === 0} />
      ))}
    </div>
  )
}
