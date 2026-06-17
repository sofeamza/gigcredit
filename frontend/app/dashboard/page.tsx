"use client"

import { useEffect, useState } from "react"
import { ScoreGauge } from "@/components/score-gauge"
import { FactorCard } from "@/components/factor-card"
import { ScoreHistoryChart } from "@/components/score-history-chart"
import { ProfileSummary } from "@/components/profile-summary"
import { ScoreInsights } from "@/components/score-insights"
import { calculateScore, getScoreHistory, getMyProfile } from "@/lib/api"
import { mockCreditScore, mockUser } from "@/lib/mock-data"

export default function DashboardPage() {
  const [score, setScore] = useState<any>(mockCreditScore)
  const [factors, setFactors] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const profileRes = await getMyProfile()
        const profile = profileRes.data

        const scoreRes = await calculateScore(profile)
        const historyRes = await getScoreHistory()

        const latestScore = {
          ...mockCreditScore,
          value: scoreRes.data.score,
          previousValue:
            historyRes.data.history?.[1]?.score_value || scoreRes.data.score,
          modelUsed: scoreRes.data.model_used,
        }

        const factorData = scoreRes.data.explanation.map(
          (text: string, index: number) => {
            const featureNames = [
              "Task Completion Rate",
              "GPS Consistency",
              "Customer Rating",
              "Platform Diversity",
            ]

            const keys = [
              "task_completion_rate",
              "gps_consistency",
              "customer_rating",
              "platform_diversity",
            ]

            const weights = [0.4, 0.3, 0.2, 0.1]

            const values = [
              profile.task_completion_rate * 100,
              profile.gps_consistency * 100,
              profile.customer_rating,
              profile.platform_diversity,
            ]

            const match = text.match(/by ([\d.]+) points/)
            const shapValue = match ? Number(match[1]) : 0
            const isNegative = text.includes("decreased")

            return {
              key: keys[index],
              name: featureNames[index],
              impact: isNegative ? "negative" : "positive",
              normalizedValue:
                keys[index] === "customer_rating"
                  ? profile.customer_rating / 5
                  : keys[index] === "platform_diversity"
                  ? profile.platform_diversity / 4
                  : values[index] / 100,
              shapValue: isNegative ? -shapValue : shapValue,
              description: text,
              advice: isNegative
                ? "Improving this factor may help increase your score."
                : "This factor is currently supporting your score.",
              weight: weights[index],
              value: values[index],
            }
          }
        )

        const historyData = historyRes.data.history.map((item: any) => ({
          date: new Date(item.created_at).toLocaleDateString(),
          score: item.score_value,
        }))

        setScore(latestScore)
        setFactors(factorData)
        setHistory(historyData)
      } catch (error: any) {
        console.error("Dashboard load failed:", error)

        if (error.response?.status === 404) {
          setError("No uploaded profile found. Please upload your CSV data first.")
        } else if (error.response?.status === 401) {
          setError("You are not logged in. Please log in again.")
        } else {
          setError("Failed to load dashboard data.")
        }
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard...</p>
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Dashboard unavailable
        </h1>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your credit score overview and factor breakdown
        </p>
      </div>

      <div data-tour="dashboard-score" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge
              score={score.value}
              previousScore={score.previousValue}
              size="lg"
            />
            <ScoreInsights score={score} />
          </div>
        </div>

        <ProfileSummary user={mockUser} score={score} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-card-foreground mb-4">
          Score History
        </h2>
        <ScoreHistoryChart data={history} />
      </div>

      <div>
        <div data-tour="score-factors" className="mb-4">
          <h2 className="text-base font-semibold text-foreground">
            Score Factors (SHAP Breakdown)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            See exactly how each factor contributes to your credit score
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {factors.map((factor) => (
            <FactorCard key={factor.key} factor={factor} />
          ))}
        </div>
      </div>
    </div>
  )
}