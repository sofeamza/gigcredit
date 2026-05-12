"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ScoreGauge } from "@/components/score-gauge"
import { FactorCard } from "@/components/factor-card"
import { ScoreHistoryChart } from "@/components/score-history-chart"
import { ProfileSummary } from "@/components/profile-summary"
import { ScoreInsights } from "@/components/score-insights"
import { useAuth } from "@/contexts/auth-context"
import { useScoreHistory, useCurrentScore, useUserProfiles } from "@/lib/hooks"
import {
  mockCreditScore,
  mockScoreFactors,
  mockScoreHistory,
  mockUser,
  getScoreCategory,
  type CreditScore,
  type GigWorkerProfile,
  type ScoreHistory,
} from "@/lib/mock-data"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { data: scoreHistoryData, isLoading: historyLoading } = useScoreHistory()
  const { data: currentScoreData, isLoading: scoreLoading } = useCurrentScore()
  const { data: profilesData, isLoading: profilesLoading } = useUserProfiles()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [authLoading, isAuthenticated, router])

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Build user profile from API or fallback to mock
  const userProfile: GigWorkerProfile = user
    ? {
        id: "WKR-001",
        name: user.name || user.email.split("@")[0],
        email: user.email,
        platform: user.platform || (profilesData?.[0]?.platform_name ?? "Grab"),
        joinedDate: user.joinedDate || "2025-06-15",
      }
    : mockUser

  // Build score history from API or fallback to mock
  const scoreHistory: ScoreHistory[] =
    scoreHistoryData?.history && scoreHistoryData.history.length > 0
      ? scoreHistoryData.history
          .slice(0, 6)
          .reverse()
          .map((item) => ({
            date: new Date(item.created_at).toISOString().slice(0, 7),
            score: item.score_value,
          }))
      : mockScoreHistory

  // Build current credit score from API or fallback to mock
  const creditScore: CreditScore = currentScoreData
    ? {
        value: currentScoreData.score_value,
        previousValue:
          scoreHistoryData?.history?.[1]?.score_value ??
          currentScoreData.score_value,
        calculatedAt: currentScoreData.created_at,
        expiresAt: currentScoreData.expires_at,
        category: getScoreCategory(currentScoreData.score_value),
        modelUsed: currentScoreData.model_used as "baseline" | "ml",
        baselineScore: currentScoreData.score_value,
        mlScore: currentScoreData.score_value,
        safetyTriggered: false,
        discrepancy: 0,
      }
    : mockCreditScore

  // Use mock factors for now (SHAP breakdown from API would need more work)
  const scoreFactors = mockScoreFactors

  const isDataLoading = historyLoading || scoreLoading || profilesLoading

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your credit score overview and factor breakdown
          {isDataLoading && (
            <span className="ml-2 inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading...
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Gauge - main focus */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge
              score={creditScore.value}
              previousScore={creditScore.previousValue}
              size="lg"
            />
            <ScoreInsights score={creditScore} />
          </div>
        </div>

        {/* Profile Summary */}
        <ProfileSummary user={userProfile} score={creditScore} />
      </div>

      {/* Score History Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-card-foreground mb-4">
          Score History
        </h2>
        <ScoreHistoryChart data={scoreHistory} />
      </div>

      {/* SHAP Factor Breakdown */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">
            Score Factors (SHAP Breakdown)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            See exactly how each factor contributes to your credit score
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scoreFactors.map((factor) => (
            <FactorCard key={factor.key} factor={factor} />
          ))}
        </div>
      </div>
    </div>
  )
}
