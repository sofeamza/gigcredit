"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  SlidersHorizontal,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  ShieldAlert,
  Brain,
  Calculator,
  Info,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ScoreGauge } from "@/components/score-gauge"
import { useAuth } from "@/contexts/auth-context"
import { useCurrentScore } from "@/lib/hooks"
import { simulateScore as apiSimulateScore, type ProfileInput } from "@/lib/api"
import {
  mockCreditScore,
  mockUserFactors,
  getScoreColor,
} from "@/lib/mock-data"
import {
  calculateScore,
  FACTOR_RANGES,
  WEIGHTS,
  SAFETY_THRESHOLD,
  type FactorInput,
} from "@/lib/scoring-engine"

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
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { data: currentScoreData } = useCurrentScore()

  const [useBackendSimulation, setUseBackendSimulation] = useState(true)
  const [isSimulating, setIsSimulating] = useState(false)
  const [backendScore, setBackendScore] = useState<number | null>(null)
  const [backendExplanation, setBackendExplanation] = useState<string[]>([])
  const [backendModelUsed, setBackendModelUsed] = useState<string>("baseline")

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [authLoading, isAuthenticated, router])

  // Get current score from API or mock
  const currentScore = currentScoreData?.score_value ?? mockCreditScore.value

  const initialFactors: FactorSlider[] = [
    {
      key: "taskCompletion",
      name: "Task Completion Rate",
      min: FACTOR_RANGES.taskCompletion.min,
      max: FACTOR_RANGES.taskCompletion.max,
      step: 1,
      unit: "%",
      currentValue: mockUserFactors.taskCompletion,
      newValue: mockUserFactors.taskCompletion,
      weight: WEIGHTS.taskCompletion,
    },
    {
      key: "gpsConsistency",
      name: "GPS Consistency (Active Days)",
      min: FACTOR_RANGES.gpsConsistency.min,
      max: FACTOR_RANGES.gpsConsistency.max,
      step: 1,
      unit: "days",
      currentValue: mockUserFactors.gpsConsistency,
      newValue: mockUserFactors.gpsConsistency,
      weight: WEIGHTS.gpsConsistency,
    },
    {
      key: "customerRating",
      name: "Customer Rating",
      min: FACTOR_RANGES.customerRating.min,
      max: FACTOR_RANGES.customerRating.max,
      step: 0.1,
      unit: "stars",
      currentValue: mockUserFactors.customerRating,
      newValue: mockUserFactors.customerRating,
      weight: WEIGHTS.customerRating,
    },
    {
      key: "platformDiversity",
      name: "Platform Diversity",
      min: FACTOR_RANGES.platformDiversity.min,
      max: FACTOR_RANGES.platformDiversity.max,
      step: 1,
      unit: "platforms",
      currentValue: mockUserFactors.platformDiversity,
      newValue: mockUserFactors.platformDiversity,
      weight: WEIGHTS.platformDiversity,
    },
  ]

  const [factors, setFactors] = useState<FactorSlider[]>(initialFactors)
  const [hasSimulated, setHasSimulated] = useState(false)

  // Build FactorInput from current slider values
  const simulatedInput: FactorInput = useMemo(() => {
    const input: Record<string, number> = {}
    for (const f of factors) {
      input[f.key] = f.newValue
    }
    return input as unknown as FactorInput
  }, [factors])

  // Run the local dual-model scoring engine (fallback)
  const localScoringResult = useMemo(
    () => calculateScore(simulatedInput),
    [simulatedInput]
  )

  // Determine which score to show
  const projectedScore = useBackendSimulation && backendScore !== null
    ? backendScore
    : localScoringResult.finalScore

  const scoreDiff = projectedScore - currentScore
  const hasChanges = factors.some((f) => f.newValue !== f.currentValue)

  // Call backend simulation API when factors change
  useEffect(() => {
    if (!hasChanges || !useBackendSimulation || !user) {
      setBackendScore(null)
      return
    }

    const runSimulation = async () => {
      setIsSimulating(true)
      try {
        const profileInput: ProfileInput = {
          user_id: user.email,
          platform_name: "Grab",
          task_completion_rate: factors.find(f => f.key === "taskCompletion")!.newValue / 100,
          gps_consistency: factors.find(f => f.key === "gpsConsistency")!.newValue / 30,
          customer_rating: factors.find(f => f.key === "customerRating")!.newValue,
          platform_diversity: factors.find(f => f.key === "platformDiversity")!.newValue,
          daily_earnings: Array(30).fill(50), // Mock earnings for simulation
        }

        const result = await apiSimulateScore(profileInput)
        setBackendScore(result.score)
        setBackendExplanation(result.explanation)
        setBackendModelUsed(result.model_used)
      } catch (error) {
        console.log("[v0] Backend simulation failed, using local scoring:", error)
        setBackendScore(null)
      } finally {
        setIsSimulating(false)
      }
    }

    // Debounce the API call
    const timeoutId = setTimeout(runSimulation, 500)
    return () => clearTimeout(timeoutId)
  }, [factors, hasChanges, useBackendSimulation, user])

  function handleSliderChange(key: string, value: number[]) {
    setFactors((prev) =>
      prev.map((f) => (f.key === key ? { ...f, newValue: value[0] } : f))
    )
    setHasSimulated(true)
  }

  function handleReset() {
    setFactors(initialFactors)
    setHasSimulated(false)
    setBackendScore(null)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            What-If Simulation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Adjust the sliders to see how changes would impact your credit score
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseBackendSimulation(!useBackendSimulation)}
            className="bg-transparent"
          >
            {useBackendSimulation ? (
              <Wifi className="w-4 h-4 mr-2 text-success" />
            ) : (
              <WifiOff className="w-4 h-4 mr-2 text-muted-foreground" />
            )}
            {useBackendSimulation ? "Live API" : "Local"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges}
            className="bg-transparent"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sliders Panel */}
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
                      (Weight: {(factor.weight * 100).toFixed(0)}%)
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
                          className={`text-xs font-semibold ${
                            diff > 0 ? "text-success" : "text-destructive"
                          }`}
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

          {/* Algorithm Explanation */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-card-foreground">
                How the Score is Calculated
              </span>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="leading-relaxed">
                <strong className="text-card-foreground">Baseline Model:</strong>{" "}
                {"Score = 300 + (weighted_sum x 550)"} where the weighted sum combines
                Task Completion (40%), GPS Consistency (30%), Customer Rating (20%),
                and Platform Diversity (10%).
              </p>
              <p className="leading-relaxed">
                <strong className="text-card-foreground">ML Model:</strong>{" "}
                A Random Forest Regressor that captures non-linear interactions
                (e.g., high ratings compensating for lower task completion).
              </p>
              <p className="leading-relaxed">
                <strong className="text-card-foreground">Safety Check:</strong>{" "}
                {"If the ML and Baseline scores differ by more than "}
                {SAFETY_THRESHOLD}
                {" points, the system reverts to the Baseline score to ensure fairness."}
              </p>
            </div>
          </div>
        </div>

        {/* Projected Score Panel */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 sticky top-8 space-y-5">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-base font-semibold text-card-foreground text-center">
                {hasSimulated ? "Projected Score" : "Current Score"}
              </h2>
              {isSimulating && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
            </div>
            <ScoreGauge score={hasSimulated ? projectedScore : currentScore} size="lg" />

            {/* Dual Model Breakdown */}
            {hasSimulated && (
              <div className="space-y-3">
                {/* Model Scores */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Calculator className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Baseline</span>
                    </div>
                    <p className="text-lg font-bold text-card-foreground tabular-nums">
                      {localScoringResult.baselineScore}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Brain className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {useBackendSimulation && backendScore !== null ? "Backend ML" : "ML Model"}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-card-foreground tabular-nums">
                      {useBackendSimulation && backendScore !== null
                        ? backendScore
                        : localScoringResult.mlScore}
                    </p>
                  </div>
                </div>

                {/* Safety Check Status */}
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    localScoringResult.safetyTriggered
                      ? "bg-destructive/10"
                      : "bg-success/10"
                  }`}
                >
                  {localScoringResult.safetyTriggered ? (
                    <ShieldAlert className="w-4 h-4 text-destructive shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                  )}
                  <div>
                    <p
                      className={`font-medium ${
                        localScoringResult.safetyTriggered
                          ? "text-destructive"
                          : "text-success"
                      }`}
                    >
                      {useBackendSimulation && backendScore !== null
                        ? `Backend: ${backendModelUsed.toUpperCase()}`
                        : localScoringResult.safetyTriggered
                          ? "Safety Triggered - Using Baseline"
                          : `Using ${localScoringResult.modelUsed === "ml" ? "ML Model" : "Baseline"}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {useBackendSimulation && backendScore !== null
                        ? "Score from backend API"
                        : `Discrepancy: ${localScoringResult.discrepancy} pts`}
                    </p>
                  </div>
                </div>

                {/* Backend Explanation */}
                {useBackendSimulation && backendExplanation.length > 0 && (
                  <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Backend Explanation
                    </p>
                    {backendExplanation.slice(0, 3).map((exp, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">
                        {exp}
                      </p>
                    ))}
                  </div>
                )}

                {/* Score Change */}
                {hasChanges && (
                  <>
                    <div className="flex items-center justify-center gap-3">
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
                        {scoreDiff} points{" "}
                        {scoreDiff > 0
                          ? "increase"
                          : scoreDiff < 0
                            ? "decrease"
                            : "no change"}
                      </span>
                    </div>
                  </>
                )}

                {/* SHAP Breakdown */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    SHAP Factor Contributions
                  </p>
                  {[
                    { label: "Task Completion", value: localScoringResult.shapBreakdown.taskCompletion },
                    { label: "GPS Consistency", value: localScoringResult.shapBreakdown.gpsConsistency },
                    { label: "Customer Rating", value: localScoringResult.shapBreakdown.customerRating },
                    { label: "Platform Diversity", value: localScoringResult.shapBreakdown.platformDiversity },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground truncate mr-2">
                        {item.label}
                      </span>
                      <span
                        className={`font-medium tabular-nums shrink-0 ${
                          item.value > 0
                            ? "text-success"
                            : item.value < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        {item.value > 0 ? "+" : ""}
                        {item.value} pts
                      </span>
                    </div>
                  ))}
                </div>

                {/* Slider Changes */}
                {hasChanges && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
                      Changes Applied
                    </p>
                    {factors
                      .filter((f) => f.newValue !== f.currentValue)
                      .map((f) => {
                        const diff = f.newValue - f.currentValue
                        return (
                          <div
                            key={f.key}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground truncate mr-2">
                              {f.name}
                            </span>
                            <span
                              className={`font-medium shrink-0 ${
                                diff > 0 ? "text-success" : "text-destructive"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}
                              {Number(diff.toFixed(1))} {f.unit}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )}

            {!hasSimulated && (
              <p className="text-sm text-muted-foreground text-center">
                Move the sliders to simulate score changes
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
