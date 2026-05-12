// GigCredit Dual-Model Scoring Engine
// Implements the algorithm from the FYP document:
//   1. Baseline Linear Model
//   2. Simulated ML (Random Forest) Model
//   3. Safety cross-check (>100 pt discrepancy → revert to baseline)
//   4. SHAP-style per-factor contribution breakdown

// --- Types ---

export interface FactorInput {
  taskCompletion: number   // 0–100 (percentage)
  gpsConsistency: number   // 0–30  (active days per month)
  customerRating: number   // 1–5   (star rating)
  platformDiversity: number // 1–5  (number of platforms)
}

export interface ScoringResult {
  finalScore: number
  baselineScore: number
  mlScore: number
  modelUsed: "baseline" | "ml"
  safetyTriggered: boolean
  discrepancy: number
  shapBreakdown: ShapBreakdown
}

export interface ShapBreakdown {
  taskCompletion: number
  gpsConsistency: number
  customerRating: number
  platformDiversity: number
}

// --- Constants ---

const WEIGHTS = {
  taskCompletion: 0.40,
  gpsConsistency: 0.30,
  customerRating: 0.20,
  platformDiversity: 0.10,
} as const

const MIN_SCORE = 300
const MAX_SCORE = 850
const SCORE_RANGE = MAX_SCORE - MIN_SCORE // 550
const SAFETY_THRESHOLD = 100

// Normalization ranges for each factor
const FACTOR_RANGES = {
  taskCompletion:    { min: 0, max: 100 },
  gpsConsistency:    { min: 0, max: 30 },
  customerRating:    { min: 1, max: 5 },
  platformDiversity: { min: 1, max: 5 },
} as const

// --- Normalization ---

function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

function normalizeFactors(input: FactorInput) {
  return {
    taskCompletion:    normalize(input.taskCompletion,    FACTOR_RANGES.taskCompletion.min,    FACTOR_RANGES.taskCompletion.max),
    gpsConsistency:    normalize(input.gpsConsistency,    FACTOR_RANGES.gpsConsistency.min,    FACTOR_RANGES.gpsConsistency.max),
    customerRating:    normalize(input.customerRating,    FACTOR_RANGES.customerRating.min,    FACTOR_RANGES.customerRating.max),
    platformDiversity: normalize(input.platformDiversity, FACTOR_RANGES.platformDiversity.min, FACTOR_RANGES.platformDiversity.max),
  }
}

// --- 1. Baseline Linear Model ---
// Formula: Final Score = 300 + (weighted_sum × 550)

export function calculateBaselineScore(input: FactorInput): number {
  const norm = normalizeFactors(input)

  const weightedSum =
    norm.taskCompletion    * WEIGHTS.taskCompletion +
    norm.gpsConsistency    * WEIGHTS.gpsConsistency +
    norm.customerRating    * WEIGHTS.customerRating +
    norm.platformDiversity * WEIGHTS.platformDiversity

  const score = MIN_SCORE + weightedSum * SCORE_RANGE
  return Math.round(Math.max(MIN_SCORE, Math.min(MAX_SCORE, score)))
}

// --- 2. Simulated ML (Random Forest) Model ---
// In production this would call the Python backend. Here we simulate the
// Random Forest's tendency to capture non-linear interactions:
//   - High rating can partially compensate for lower task completion
//   - Very high consistency gets a small bonus
//   - Platform diversity has diminishing returns above 3

export function calculateMLScore(input: FactorInput): number {
  const norm = normalizeFactors(input)

  // Start with the same weighted sum
  let weightedSum =
    norm.taskCompletion    * WEIGHTS.taskCompletion +
    norm.gpsConsistency    * WEIGHTS.gpsConsistency +
    norm.customerRating    * WEIGHTS.customerRating +
    norm.platformDiversity * WEIGHTS.platformDiversity

  // Non-linear interaction: high rating compensates for lower task completion
  if (norm.customerRating > 0.85 && norm.taskCompletion < 0.8) {
    const compensation = (norm.customerRating - 0.85) * 0.15
    weightedSum += compensation
  }

  // Consistency bonus: very active workers get a small boost
  if (norm.gpsConsistency > 0.9) {
    weightedSum += (norm.gpsConsistency - 0.9) * 0.05
  }

  // Diminishing returns on platform diversity above 3 platforms
  if (input.platformDiversity > 3) {
    const excess = normalize(input.platformDiversity, 3, 5)
    const penalty = excess * 0.02
    weightedSum -= penalty
  }

  // Add slight randomized noise to simulate ML variance (seeded by inputs)
  const seed = (input.taskCompletion * 7 + input.gpsConsistency * 13 +
    input.customerRating * 17 + input.platformDiversity * 23) % 100
  const noise = ((seed / 100) - 0.5) * 0.03 // ±1.5% variance
  weightedSum += noise

  const score = MIN_SCORE + weightedSum * SCORE_RANGE
  return Math.round(Math.max(MIN_SCORE, Math.min(MAX_SCORE, score)))
}

// --- 3. Dual-Model Scoring with Safety Check ---

export function calculateScore(input: FactorInput): ScoringResult {
  const baselineScore = calculateBaselineScore(input)
  const mlScore = calculateMLScore(input)
  const discrepancy = Math.abs(mlScore - baselineScore)
  const safetyTriggered = discrepancy > SAFETY_THRESHOLD

  // If discrepancy > 100 points, revert to baseline for safety
  const finalScore = safetyTriggered ? baselineScore : mlScore
  const modelUsed = safetyTriggered ? "baseline" : "ml"

  // Calculate SHAP breakdown for the final score
  const shapBreakdown = calculateSHAP(input, finalScore)

  return {
    finalScore,
    baselineScore,
    mlScore,
    modelUsed,
    safetyTriggered,
    discrepancy,
    shapBreakdown,
  }
}

// --- 4. SHAP Explainability ---
// Calculates how many points each factor contributes to the final score.
// Uses the Shapley approach: for each factor, compute the score with and
// without it (replaced by the population average) to determine its marginal
// contribution.

const POPULATION_AVERAGES: FactorInput = {
  taskCompletion: 75,
  gpsConsistency: 18,
  customerRating: 3.8,
  platformDiversity: 2,
}

export function calculateSHAP(input: FactorInput, finalScore: number): ShapBreakdown {
  const baseAllAvg = calculateBaselineScore(POPULATION_AVERAGES)

  const factors: (keyof FactorInput)[] = [
    "taskCompletion",
    "gpsConsistency",
    "customerRating",
    "platformDiversity",
  ]

  const rawContributions: Record<string, number> = {}

  for (const factor of factors) {
    // Score with this factor set to population average (removed)
    const withoutFactor = { ...input, [factor]: POPULATION_AVERAGES[factor] }
    const scoreWithout = calculateBaselineScore(withoutFactor)
    // Marginal contribution = how much this factor adds vs its average
    rawContributions[factor] = finalScore - scoreWithout
  }

  // Normalize contributions so they sum to (finalScore - baseAllAvg)
  const totalRaw = Object.values(rawContributions).reduce((a, b) => a + b, 0)
  const targetTotal = finalScore - baseAllAvg

  const scale = totalRaw !== 0 ? targetTotal / totalRaw : 0

  return {
    taskCompletion:    Math.round(rawContributions.taskCompletion * scale),
    gpsConsistency:    Math.round(rawContributions.gpsConsistency * scale),
    customerRating:    Math.round(rawContributions.customerRating * scale),
    platformDiversity: Math.round(rawContributions.platformDiversity * scale),
  }
}

// --- Utility exports ---

export { WEIGHTS, FACTOR_RANGES, MIN_SCORE, MAX_SCORE, SCORE_RANGE, SAFETY_THRESHOLD }
