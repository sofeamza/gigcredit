"use client"

import { useEffect, useState } from "react"
import { ScoreGauge } from "@/components/score-gauge"
import { FactorCard } from "@/components/factor-card"
import { ScoreHistoryChart } from "@/components/score-history-chart"
import { ProfileSummary } from "@/components/profile-summary"
import { ScoreInsights } from "@/components/score-insights"
import { calculateScore, getScoreHistory, getMyProfile, getCurrentUser } from "@/lib/api"
import { mockCreditScore } from "@/lib/mock-data"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info } from "lucide-react"

export default function DashboardPage() {
  const [score, setScore] = useState<any>(mockCreditScore)
  const [profileUser, setProfileUser] = useState<any>(null)
  const [factors, setFactors] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [eligibility, setEligibility] = useState<"insufficient" | "preliminary" | "official" | null>(null)
  const [monthsCount, setMonthsCount] = useState(0)
  const [scoreVersion, setScoreVersion] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [profileRes, userRes] = await Promise.all([getMyProfile(), getCurrentUser()])
        const profile = profileRes.data

        setProfileUser({
          id: profile.user_id,
          email: userRes.data.email,
          platform: profile.platform_name,
          monthsCount: profile.months_count,
          eligibility: profile.eligibility,
        })

        const scoreRes = await calculateScore()
        const historyRes = await getScoreHistory()

        setEligibility(scoreRes.data.eligibility)
        setMonthsCount(scoreRes.data.months_count)
        setScoreVersion(scoreRes.data.version)

        const latestScore = {
          ...mockCreditScore,
          value: scoreRes.data.score,
          previousValue:
            historyRes.data.history?.[1]?.score_value || scoreRes.data.score,
          modelUsed: scoreRes.data.model_used,
        }

        const featureMeta = [
          {
            key: "task_completion_rate",
            name: "Task Completion Rate",
            weight: 0.4,
            value: profile.task_completion_rate * 100,
            normalizedValue: profile.task_completion_rate,
            describe: (pos: boolean, pts: number) =>
              pos
                ? `You completed ${(profile.task_completion_rate * 100).toFixed(0)}% of your assigned tasks. This strong completion rate added ${pts} points to your score.`
                : `Your task completion rate is ${(profile.task_completion_rate * 100).toFixed(0)}%. Completing more tasks consistently will help improve your score.`,
            advise: (pos: boolean) =>
              pos
                ? "Keep accepting tasks you can reliably finish to maintain this score."
                : "Try to complete at least 85% of accepted tasks each month.",
          },
          {
            key: "gps_consistency",
            name: "GPS Consistency",
            weight: 0.3,
            value: profile.gps_consistency * 100,
            normalizedValue: profile.gps_consistency,
            describe: (pos: boolean, pts: number) =>
              pos
                ? `Your GPS tracking shows ${(profile.gps_consistency * 100).toFixed(0)}% route consistency, adding ${pts} points. This signals reliability to lenders.`
                : `Your GPS consistency is at ${(profile.gps_consistency * 100).toFixed(0)}%. Irregular routes can suggest instability in your work pattern.`,
            advise: (pos: boolean) =>
              pos
                ? "Consistent routing shows you are a dependable worker — keep it up."
                : "Ensure your GPS is active during deliveries and try to maintain regular routes.",
          },
          {
            key: "customer_rating",
            name: "Customer Rating",
            weight: 0.2,
            value: profile.customer_rating,
            normalizedValue: profile.customer_rating / 5,
            describe: (pos: boolean, pts: number) =>
              pos
                ? `Your average customer rating is ${profile.customer_rating.toFixed(1)}/5.0, contributing ${pts} points. High ratings reflect service quality.`
                : `Your average customer rating is ${profile.customer_rating.toFixed(1)}/5.0. Low ratings reduce lender confidence in your work quality.`,
            advise: (pos: boolean) =>
              pos
                ? "Great service earns great ratings — maintain prompt and friendly delivery."
                : "Focus on timely deliveries and polite communication to improve ratings.",
          },
          {
            key: "platform_diversity",
            name: "Platform Diversity",
            weight: 0.1,
            value: profile.platform_diversity,
            normalizedValue: profile.platform_diversity / 4,
            describe: (pos: boolean, pts: number) =>
              pos
                ? `You work across ${profile.platform_diversity} platform${profile.platform_diversity !== 1 ? "s" : ""}, adding ${pts} points. Diversified income sources reduce financial risk.`
                : `You are currently active on ${profile.platform_diversity} platform. Using more gig platforms shows income diversification.`,
            advise: (pos: boolean) =>
              pos
                ? "Working across multiple platforms shows income resilience — keep diversifying."
                : "Consider signing up to additional gig platforms like Grab, Lalamove, or FoodPanda.",
          },
        ]

        const factorData = scoreRes.data.explanation.map(
          (text: string, index: number) => {
            const meta = featureMeta[index]
            const match = text.match(/by ([\d.]+) points/)
            const shapValue = match ? Number(match[1]) : 0
            const isNegative = text.includes("decreased")

            return {
              key: meta.key,
              name: meta.name,
              impact: isNegative ? "negative" : "positive",
              normalizedValue: meta.normalizedValue,
              shapValue: isNegative ? -shapValue : shapValue,
              description: meta.describe(!isNegative, shapValue),
              advice: meta.advise(!isNegative),
              weight: meta.weight,
              value: meta.value,
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
      <div className="rounded-xl border border-border bg-card p-6 max-w-3xl mx-auto space-y-3">
        <h1 className="text-xl font-semibold text-foreground">Dashboard unavailable</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your credit score overview and factor breakdown</p>
      </div>

      <div data-tour="dashboard-score" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge
              score={score.value}
              previousScore={score.previousValue}
              size="lg"
            />
            <ScoreInsights
              score={score}
              eligibility={eligibility}
              monthsCount={monthsCount}
              scoreVersion={scoreVersion}
            />
          </div>
        </div>

        <ProfileSummary user={profileUser} score={score} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-card-foreground mb-4">
          Score History
        </h2>
        <ScoreHistoryChart data={history} />
      </div>

      <div>
        <div data-tour="score-factors" className="mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Score Factors
            </h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="font-medium mb-1">How is this calculated?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Each factor's impact is measured using SHAP (SHapley Additive exPlanations) — a method that shows exactly how much each part of your work history pushed your score up or down. Think of it as a breakdown of what's helping you and what's holding you back.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            See what's helping and what's holding back your credit score
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