"use client"

import { useEffect, useState } from "react"
import {
  SlidersHorizontal,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  Brain,
  Info,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ScoreGauge } from "@/components/score-gauge"

import {
  FACTOR_RANGES,
  WEIGHTS,
  SAFETY_THRESHOLD,
  type FactorInput,
} from "@/lib/scoring-engine"

import { getScoreColor } from "@/lib/mock-data"

import {
  getMyProfile,
  calculateScore,
  runSimulation,
} from "@/lib/api"

const FACTOR_META: Record<string, { label: string; emoji: string; tip: string }> = {
  task_completion_rate: {
    label: "Task Completion",
    emoji: "✅",
    tip: "Complete more of your accepted jobs each month.",
  },
  gps_consistency: {
    label: "GPS Consistency",
    emoji: "📍",
    tip: "Keep your GPS active and maintain regular routes.",
  },
  customer_rating: {
    label: "Customer Rating",
    emoji: "⭐",
    tip: "Timely, polite service earns higher ratings.",
  },
  platform_diversity: {
    label: "Platform Diversity",
    emoji: "🔗",
    tip: "Working on more platforms shows income resilience.",
  },
}

function parseShap(lines: string[]) {
  return lines.map((line) => {
    const match = line.match(/^(\S+)\s+(increased|decreased)\s+your score by ([\d.]+) points/)
    if (!match) return null
    const key = match[1]
    const positive = match[2] === "increased"
    const pts = parseFloat(match[3])
    const meta = FACTOR_META[key]
    return { key, label: meta?.label ?? key, emoji: meta?.emoji ?? "📊", tip: meta?.tip, positive, pts }
  }).filter(Boolean) as { key: string; label: string; emoji: string; tip?: string; positive: boolean; pts: number }[]
}

function ShapBreakdown({ explanations }: { explanations: string[] }) {
  const factors = parseShap(explanations)
  if (factors.length === 0) return null

  const max = Math.max(...factors.map((f) => f.pts), 1)

  return (
    <div className="pt-2 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        What's driving this score?
      </p>
      <p className="text-xs text-muted-foreground">
        Each value shows how much that factor pushed your score above or below the average worker.
      </p>

      {factors.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-card-foreground flex items-center gap-1.5">
              <span>{f.emoji}</span>
              {f.label}
            </span>
            <span className={`text-xs font-semibold tabular-nums ${f.positive ? "text-success" : "text-destructive"}`}>
              {f.positive ? "+" : "−"}{f.pts} pts
            </span>
          </div>

          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${f.positive ? "bg-primary" : "bg-destructive"}`}
              style={{ width: `${(f.pts / max) * 100}%` }}
            />
          </div>

          {f.tip && !f.positive && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 To improve — {f.tip}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

interface FactorSlider {
  key: keyof FactorInput
  name: string
  min: number
  max: number
  step: number
  unit: string
  currentValue: number
  newValue: number
  weight: number
}

export default function SimulationPage() {
  const [factors, setFactors] = useState<FactorSlider[]>([])
  const [currentScore, setCurrentScore] = useState(0)
  const [projectedScore, setProjectedScore] = useState(0)
  const [modelUsed, setModelUsed] = useState("")
  const [explanations, setExplanations] = useState<string[]>([])
  const [hasSimulated, setHasSimulated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)

  const scoreDiff = projectedScore - currentScore
  const hasChanges = factors.some((f) => f.newValue !== f.currentValue)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileRes = await getMyProfile()
        const profile = profileRes.data

        const scoreRes = await calculateScore(profile)

        setCurrentScore(scoreRes.data.score)
        setProjectedScore(scoreRes.data.score)
        setModelUsed(scoreRes.data.model_used)

        const loadedFactors: FactorSlider[] = [
          {
            key: "taskCompletion",
            name: "Task Completion Rate",
            min: FACTOR_RANGES.taskCompletion.min,
            max: FACTOR_RANGES.taskCompletion.max,
            step: 1,
            unit: "%",
            currentValue: profile.task_completion_rate * 100,
            newValue: profile.task_completion_rate * 100,
            weight: WEIGHTS.taskCompletion,
          },
          {
            key: "gpsConsistency",
            name: "GPS Consistency",
            min: FACTOR_RANGES.gpsConsistency.min,
            max: FACTOR_RANGES.gpsConsistency.max,
            step: 1,
            unit: "%",
            currentValue: profile.gps_consistency * 100,
            newValue: profile.gps_consistency * 100,
            weight: WEIGHTS.gpsConsistency,
          },
          {
            key: "customerRating",
            name: "Customer Rating",
            min: FACTOR_RANGES.customerRating.min,
            max: FACTOR_RANGES.customerRating.max,
            step: 0.1,
            unit: "stars",
            currentValue: profile.customer_rating,
            newValue: profile.customer_rating,
            weight: WEIGHTS.customerRating,
          },
          {
            key: "platformDiversity",
            name: "Platform Diversity",
            min: FACTOR_RANGES.platformDiversity.min,
            max: FACTOR_RANGES.platformDiversity.max,
            step: 1,
            unit: "platforms",
            currentValue: profile.platform_diversity,
            newValue: profile.platform_diversity,
            weight: WEIGHTS.platformDiversity,
          },
        ]

        setFactors(loadedFactors)
      } catch (error) {
        console.error("Failed to load simulation data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  function handleSliderChange(key: string, value: number[]) {
    setFactors((prev) =>
      prev.map((f) =>
        f.key === key ? { ...f, newValue: value[0] } : f
      )
    )
  }

  function handleReset() {
    setFactors((prev) =>
      prev.map((f) => ({
        ...f,
        newValue: f.currentValue,
      }))
    )

    setProjectedScore(currentScore)
    setHasSimulated(false)
    setExplanations([])
  }

  async function handleRunSimulation() {
    setSimulating(true)

    try {
      const getValue = (key: keyof FactorInput) =>
        factors.find((f) => f.key === key)?.newValue || 0

      const payload = {
        user_id: "123",
        platform_name: "Grab",
        task_completion_rate: getValue("taskCompletion") / 100,
        gps_consistency: getValue("gpsConsistency") / 100,
        customer_rating: getValue("customerRating"),
        platform_diversity: getValue("platformDiversity"),
        daily_earnings: [50, 60, 70],
      }

      const res = await runSimulation(payload)

      setProjectedScore(res.data.score)
      setModelUsed(res.data.model_used)
      setExplanations(res.data.explanation || [])
      setHasSimulated(true)
    } catch (error) {
      console.error("Simulation failed:", error)
      alert("Simulation failed. Please make sure you are logged in and backend is running.")
    } finally {
      setSimulating(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading simulation...</p>
  }

  return (
    <div   data-tour="simulation-panel" className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            What-If Simulation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Adjust the sliders to see how changes would impact your credit score using the backend ML engine.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={!hasChanges && !hasSimulated}
          className="self-start bg-transparent"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          {factors.map((factor) => {
            const diff = factor.newValue - factor.currentValue
            const isChanged = diff !== 0

            return (
              <div
                key={factor.key}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-card-foreground">
                      {factor.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Weight: {(factor.weight * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Current: {factor.currentValue}
                      {factor.unit === "%" ? "%" : ""}
                    </span>

                    {isChanged && (
                      <span className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span
                          className={
                            diff > 0
                              ? "text-success text-xs font-semibold"
                              : "text-destructive text-xs font-semibold"
                          }
                        >
                          {factor.newValue}
                          {factor.unit === "%" ? "%" : ""}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <Slider
                  value={[factor.newValue]}
                  min={factor.min}
                  max={factor.max}
                  step={factor.step}
                  onValueChange={(value) =>
                    handleSliderChange(factor.key, value)
                  }
                  className="w-full"
                />

                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>
                    {factor.min} {factor.unit}
                  </span>
                  <span>
                    {factor.max} {factor.unit}
                  </span>
                </div>
              </div>
            )
          })}

          <Button
            onClick={handleRunSimulation}
            disabled={simulating}
            className="w-full"
            size="lg"
          >
            {simulating ? "Running simulation..." : "Run Simulation"}
          </Button>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-card-foreground">
                How the Score is Calculated
              </span>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                The backend uses a dual-model approach: a baseline weighted model and a Random Forest ML model.
              </p>
              <p>
                If the ML score differs too much from the baseline, the system uses the safer baseline result.
              </p>
              <p>Safety threshold: {SAFETY_THRESHOLD} points.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 sticky top-8 space-y-5">
            <h2 className="text-base font-semibold text-card-foreground text-center">
              {hasSimulated ? "Projected Score" : "Current Score"}
            </h2>

            <ScoreGauge
              score={hasSimulated ? projectedScore : currentScore}
              size="sm"
            />

            <div className="space-y-4">
              <div className="flex items-center justify-center gap-6 mt-12">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="text-lg font-bold text-card-foreground">
                    {currentScore}
                  </p>
                </div>

                <ArrowRight className="w-5 h-5 text-muted-foreground" />

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Projected</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: getScoreColor(projectedScore) }}
                  >
                    {projectedScore}
                  </p>
                </div>
              </div>

              {hasSimulated && (
                <>
                  <div
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
                      scoreDiff > 0
                        ? "bg-success/10"
                        : scoreDiff < 0
                        ? "bg-destructive/10"
                        : "bg-muted"
                    }`}
                  >
                    {scoreDiff > 0 ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : scoreDiff < 0 ? (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    ) : (
                      <Minus className="w-4 h-4 text-muted-foreground" />
                    )}

                    <span
                      className={`text-sm font-semibold ${
                        scoreDiff > 0
                          ? "text-success"
                          : scoreDiff < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {scoreDiff > 0 ? "+" : ""}
                      {scoreDiff} points
                    </span>
                  </div>

                  <div className="rounded-lg border border-border p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Brain className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Model Used
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-card-foreground uppercase">
                      {modelUsed || "N/A"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-sm">
                    <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                    <p className="text-success font-medium">
                      Backend simulation completed
                    </p>
                  </div>

                  <ShapBreakdown explanations={explanations} />
                </>
              )}

              {!hasSimulated && (
                <p className="text-sm text-muted-foreground text-center">
                  Move the sliders and click Run Simulation.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}