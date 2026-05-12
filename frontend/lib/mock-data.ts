// Mock data for GigCredit dashboard - simulating API responses
// Score values are computed by the dual-model scoring engine (see lib/scoring-engine.ts)

import {
  calculateScore,
  type FactorInput,
  WEIGHTS,
} from "@/lib/scoring-engine"

export interface GigWorkerProfile {
  id: string
  name: string
  email: string
  platform: string
  joinedDate: string
  avatar?: string
}

export interface CreditScore {
  value: number
  previousValue: number
  calculatedAt: string
  expiresAt: string
  category: "Poor" | "Fair" | "Good" | "Excellent"
  modelUsed: "baseline" | "ml"
  baselineScore: number
  mlScore: number
  safetyTriggered: boolean
  discrepancy: number
}

export interface ScoreFactor {
  name: string
  key: string
  weight: number
  value: number
  normalizedValue: number
  impact: "positive" | "neutral" | "negative"
  shapValue: number
  description: string
  advice: string
}

export interface ScoreHistory {
  date: string
  score: number
}

export interface SimulationResult {
  currentScore: number
  projectedScore: number
  difference: number
  factors: {
    name: string
    currentValue: number
    newValue: number
    pointsChanged: number
  }[]
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  avgScore: number
  apiLatency: number
  scoreDistribution: { category: string; count: number; percentage: number }[]
  userGrowth: { month: string; users: number }[]
  recentUsers: {
    id: string
    name: string
    email: string
    score: number
    platform: string
    lastActive: string
    status: "active" | "inactive"
  }[]
  systemHealth: {
    api: "healthy" | "warning" | "error"
    database: "healthy" | "warning" | "error"
    ml: "healthy" | "warning" | "error"
  }
}

// --- Current user's raw factor inputs ---
export const mockUserFactors: FactorInput = {
  taskCompletion: 98,      // 98% completion rate
  gpsConsistency: 28,      // 28 active days out of 30
  customerRating: 4.9,     // 4.9 / 5.0 stars
  platformDiversity: 2,    // 2 platforms (Grab, FoodPanda)
}

// Previous month's factors (for history)
const previousFactors: FactorInput = {
  taskCompletion: 92,
  gpsConsistency: 25,
  customerRating: 4.7,
  platformDiversity: 2,
}

// Compute scores via the dual-model engine
const currentResult = calculateScore(mockUserFactors)
const previousResult = calculateScore(previousFactors)

export const mockUser: GigWorkerProfile = {
  id: "WKR-001",
  name: "Ahmad Rizal",
  email: "ahmad.rizal@email.com",
  platform: "Grab",
  joinedDate: "2025-06-15",
}

export const mockCreditScore: CreditScore = {
  value: currentResult.finalScore,
  previousValue: previousResult.finalScore,
  calculatedAt: "2026-02-10T08:00:00Z",
  expiresAt: "2026-03-10T08:00:00Z",
  category: getScoreCategory(currentResult.finalScore),
  modelUsed: currentResult.modelUsed,
  baselineScore: currentResult.baselineScore,
  mlScore: currentResult.mlScore,
  safetyTriggered: currentResult.safetyTriggered,
  discrepancy: currentResult.discrepancy,
}

function getImpact(shapValue: number): "positive" | "neutral" | "negative" {
  if (shapValue > 5) return "positive"
  if (shapValue < -5) return "negative"
  return "neutral"
}

export const mockScoreFactors: ScoreFactor[] = [
  {
    name: "Task Completion Rate",
    key: "task_completion",
    weight: WEIGHTS.taskCompletion,
    value: mockUserFactors.taskCompletion,
    normalizedValue: mockUserFactors.taskCompletion / 100,
    impact: getImpact(currentResult.shapBreakdown.taskCompletion),
    shapValue: currentResult.shapBreakdown.taskCompletion,
    description:
      "You completed 196 out of 200 assigned tasks this month. This is in the top 10% of all workers.",
    advice:
      "Keep maintaining your high completion rate. Avoid cancelling tasks once accepted.",
  },
  {
    name: "GPS Consistency",
    key: "gps_consistency",
    weight: WEIGHTS.gpsConsistency,
    value: mockUserFactors.gpsConsistency,
    normalizedValue: mockUserFactors.gpsConsistency / 30,
    impact: getImpact(currentResult.shapBreakdown.gpsConsistency),
    shapValue: currentResult.shapBreakdown.gpsConsistency,
    description:
      "Your GPS data shows you were active for 28 out of 30 days, with consistent work hours.",
    advice:
      "Try to maintain regular working hours. Consistent schedules show reliability to lenders.",
  },
  {
    name: "Customer Rating",
    key: "customer_rating",
    weight: WEIGHTS.customerRating,
    value: mockUserFactors.customerRating,
    normalizedValue: (mockUserFactors.customerRating - 1) / 4,
    impact: getImpact(currentResult.shapBreakdown.customerRating),
    shapValue: currentResult.shapBreakdown.customerRating,
    description:
      "Your average rating is 4.9 out of 5.0 stars from 196 customer reviews.",
    advice:
      "Excellent rating! Continue providing great service to maintain this score.",
  },
  {
    name: "Platform Diversity",
    key: "platform_diversity",
    weight: WEIGHTS.platformDiversity,
    value: mockUserFactors.platformDiversity,
    normalizedValue: (mockUserFactors.platformDiversity - 1) / 4,
    impact: getImpact(currentResult.shapBreakdown.platformDiversity),
    shapValue: currentResult.shapBreakdown.platformDiversity,
    description:
      "You currently work on 2 platforms (Grab, FoodPanda). Workers with 3+ platforms score higher.",
    advice:
      "Consider adding Lalamove or ShopeeFood to diversify your income sources and boost this factor.",
  },
]

export const mockScoreHistory: ScoreHistory[] = [
  { date: "2025-09", score: 610 },
  { date: "2025-10", score: 645 },
  { date: "2025-11", score: 660 },
  { date: "2025-12", score: 685 },
  { date: "2026-01", score: 700 },
  { date: "2026-02", score: 720 },
]

export const mockAdminStats: AdminStats = {
  totalUsers: 1247,
  activeUsers: 983,
  avgScore: 654,
  apiLatency: 142,
  scoreDistribution: [
    { category: "Poor (300-499)", count: 187, percentage: 15 },
    { category: "Fair (500-669)", count: 436, percentage: 35 },
    { category: "Good (670-799)", count: 498, percentage: 40 },
    { category: "Excellent (800-850)", count: 126, percentage: 10 },
  ],
  userGrowth: [
    { month: "Sep", users: 620 },
    { month: "Oct", users: 745 },
    { month: "Nov", users: 890 },
    { month: "Dec", users: 1020 },
    { month: "Jan", users: 1150 },
    { month: "Feb", users: 1247 },
  ],
  recentUsers: [
    {
      id: "WKR-001",
      name: "Ahmad Rizal",
      email: "ahmad.rizal@email.com",
      score: 720,
      platform: "Grab",
      lastActive: "2026-02-10",
      status: "active",
    },
    {
      id: "WKR-002",
      name: "Siti Aminah",
      email: "siti.aminah@email.com",
      score: 685,
      platform: "FoodPanda",
      lastActive: "2026-02-09",
      status: "active",
    },
    {
      id: "WKR-003",
      name: "Muthu Kumar",
      email: "muthu.k@email.com",
      score: 780,
      platform: "Lalamove",
      lastActive: "2026-02-10",
      status: "active",
    },
    {
      id: "WKR-004",
      name: "Lim Wei Jie",
      email: "weijie.lim@email.com",
      score: 520,
      platform: "Grab",
      lastActive: "2026-02-08",
      status: "active",
    },
    {
      id: "WKR-005",
      name: "Nurul Huda",
      email: "nurul.h@email.com",
      score: 430,
      platform: "ShopeeFood",
      lastActive: "2026-01-28",
      status: "inactive",
    },
    {
      id: "WKR-006",
      name: "Rajesh Singh",
      email: "rajesh.s@email.com",
      score: 810,
      platform: "Grab",
      lastActive: "2026-02-10",
      status: "active",
    },
    {
      id: "WKR-007",
      name: "Fatimah Zahra",
      email: "fatimah.z@email.com",
      score: 590,
      platform: "FoodPanda",
      lastActive: "2026-02-07",
      status: "active",
    },
    {
      id: "WKR-008",
      name: "Tan Mei Ling",
      email: "meiling.t@email.com",
      score: 340,
      platform: "Lalamove",
      lastActive: "2026-01-15",
      status: "inactive",
    },
  ],
  systemHealth: {
    api: "healthy",
    database: "healthy",
    ml: "healthy",
  },
}

export function getScoreCategory(
  score: number
): "Poor" | "Fair" | "Good" | "Excellent" {
  if (score < 500) return "Poor"
  if (score < 670) return "Fair"
  if (score < 800) return "Good"
  return "Excellent"
}

export function getScoreColor(score: number): string {
  if (score < 500) return "hsl(0, 72%, 51%)"
  if (score < 670) return "hsl(43, 96%, 56%)"
  if (score < 800) return "hsl(162, 63%, 41%)"
  return "hsl(142, 71%, 45%)"
}

export function getScoreColorClass(score: number): string {
  if (score < 500) return "text-destructive"
  if (score < 670) return "text-warning"
  if (score < 800) return "text-primary"
  return "text-success"
}
