"use client"

import { useEffect, useState } from "react"
import { ScoreGauge } from "@/components/score-gauge"
import { FactorCard } from "@/components/factor-card"
import { ScoreHistoryChart } from "@/components/score-history-chart"
import { ScoreHistoryTimeline } from "@/components/score-history-timeline"
import { ProfileSummary } from "@/components/profile-summary"
import { ScoreInsights } from "@/components/score-insights"
import { calculateScore, getScoreHistory, getDailyScores, getMyProfile, getCurrentUser } from "@/lib/api"
import Link from "next/link"
import { Upload, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

function ScoreHistorySection({ monthlyData, timeline }: { monthlyData: any[]; timeline: any[] }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [dailyData, setDailyData] = useState<any[]>([])
  const [loadingDaily, setLoadingDaily] = useState(false)

  const availableMonths = [...new Set(monthlyData.map((d) => d.rawPeriod).filter(Boolean))]

  async function handleMonthSelect(month: string | null) {
    setSelectedMonth(month)
    if (!month) { setDailyData([]); return }
    setLoadingDaily(true)
    try {
      const res = await getDailyScores(month)
      setDailyData(res.data.daily.map((d: any) => ({
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: d.score,
      })))
    } finally {
      setLoadingDaily(false)
    }
  }

  const chartData = selectedMonth ? dailyData : monthlyData

  return (
    <div>
      {/* Month filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => handleMonthSelect(null)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
            !selectedMonth
              ? "bg-primary text-primary-foreground border-primary"
              : "text-muted-foreground border-border hover:border-primary hover:text-foreground"
          )}
        >
          All months
        </button>
        {availableMonths.map((m: string) => (
          <button
            key={m}
            type="button"
            onClick={() => handleMonthSelect(m)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              selectedMonth === m
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground border-border hover:border-primary hover:text-foreground"
            )}
          >
            {new Date(m + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </button>
        ))}
      </div>

      {loadingDaily ? (
        <div className="h-[260px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading daily scores...</p>
        </div>
      ) : (
        <ScoreHistoryChart data={chartData} />
      )}

      <TimelineSection entries={timeline} />
    </div>
  )
}

function TimelineSection({ entries }: { entries: any[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-6 pt-6 border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
          Timeline
        </p>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-4">
          <ScoreHistoryTimeline entries={entries} />
        </div>
      )}
    </div>
  )
}
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
  const [timeline, setTimeline] = useState<any[]>([])
  const [eligibility, setEligibility] = useState<"insufficient" | "preliminary" | "official" | null>(null)
  const [monthsCount, setMonthsCount] = useState(0)
  const [scoreVersion, setScoreVersion] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const userRes = await getCurrentUser()

        let profile: any = null
        try {
          const profileRes = await getMyProfile()
          profile = profileRes.data
        } catch (err: any) {
          if (err?.response?.status === 404) {
            setError("No uploaded profile found. Please upload your work data first.")
            setLoading(false)
            return
          }
          throw err
        }

        setProfileUser({
          id: profile.user_id,
          email: userRes.data.email,
          platform: profile.platform_name,
          monthsCount: profile.months_count,
          eligibility: profile.eligibility,
        })

        // Sequential, not parallel: calculateScore() may insert a new history
        // entry, so history must be fetched after it finishes or the GET can
        // race the POST and come back empty on the very first calculation.
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

        // Deduplicate by data_period — keep one entry per month (newest-first from API)
        const seen = new Set<string>()
        const deduped = historyRes.data.history.filter((item: any) => {
          const key = item.data_period ?? item.created_at
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })

        const rawHistory = [...deduped].reverse() // oldest first
        const historyData = rawHistory.map((item: any) => ({
          date: item.data_period
            ? new Date(item.data_period + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          score: item.score_value,
          rawPeriod: item.data_period ?? null,
        }))
        const timelineData = [...rawHistory].reverse().map((item: any, idx: number, arr: any[]) => ({
          ...item,
          previousScore: arr[idx + 1]?.score_value ?? null,
        }))

        setScore(latestScore)
        setFactors(factorData)
        setHistory(historyData)
        setTimeline(timelineData)
      } catch (error: any) {
        if (error?.response?.status === 401) {
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
    const isNoData = error.includes("No uploaded profile")
    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-6">
        {isNoData ? (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-8 py-10 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Your dashboard is waiting</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
                Upload your gig work data to generate your credit score. It only takes a few seconds.
              </p>
            </div>
            <div className="px-8 py-6 space-y-4">
              {[
                { dot: "bg-destructive", label: "0 – 2 months", desc: "Not enough data yet" },
                { dot: "bg-warning",     label: "3 – 5 months", desc: "Preliminary Score unlocked" },
                { dot: "bg-success",     label: "6+ months",    desc: "Official GigCredit Score" },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
                  <span className="text-sm font-medium text-foreground">{t.label}</span>
                  <span className="text-sm text-muted-foreground">— {t.desc}</span>
                </div>
              ))}
              <Link href="/dashboard/upload">
                <button className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium px-4 py-3 hover:bg-primary/90 transition-colors">
                  <Upload className="w-4 h-4" />
                  Upload my work data
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h1 className="text-xl font-semibold text-foreground">Dashboard unavailable</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}
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
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-semibold text-card-foreground">
            Score History
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="font-medium mb-1">How does this work?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A new point is only added here when your score actually changes — usually after you upload new work data. The chart shows the trend; the list below explains exactly why each change happened, generated from the same AI explainability model used in Score Factors.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          How your score has changed over time, and why
        </p>

        <ScoreHistorySection monthlyData={history} timeline={timeline} />
      </div>

      <div data-tour="score-factors">
        <div className="mb-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {factors.map((factor) => (
            <FactorCard key={factor.key} factor={factor} />
          ))}
        </div>
      </div>
    </div>
  )
}