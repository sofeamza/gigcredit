"use client"

import { ScoreGauge } from "@/components/score-gauge"
import { FactorCard } from "@/components/factor-card"
import { ScoreHistoryChart } from "@/components/score-history-chart"
import { ProfileSummary } from "@/components/profile-summary"
import { ScoreInsights } from "@/components/score-insights"
import {
  mockCreditScore,
  mockScoreFactors,
  mockScoreHistory,
  mockUser,
} from "@/lib/mock-data"

export default function DashboardPage() {
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Gauge - main focus */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge
              score={mockCreditScore.value}
              previousScore={mockCreditScore.previousValue}
              size="lg"
            />
            <ScoreInsights score={mockCreditScore} />
          </div>
        </div>

        {/* Profile Summary */}
        <ProfileSummary user={mockUser} score={mockCreditScore} />
      </div>

      {/* Score History Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-card-foreground mb-4">
          Score History
        </h2>
        <ScoreHistoryChart data={mockScoreHistory} />
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
          {mockScoreFactors.map((factor) => (
            <FactorCard key={factor.key} factor={factor} />
          ))}
        </div>
      </div>
    </div>
  )
}
