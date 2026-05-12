// API client for connecting to the FastAPI backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Token management
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("gigcredit_token", token)
    } else {
      localStorage.removeItem("gigcredit_token")
    }
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken
  if (typeof window !== "undefined") {
    authToken = localStorage.getItem("gigcredit_token")
  }
  return authToken
}

export function clearAuthToken() {
  authToken = null
  if (typeof window !== "undefined") {
    localStorage.removeItem("gigcredit_token")
  }
}

// API error class
export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
    this.name = "ApiError"
  }
}

// Generic fetch wrapper with auth
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken()

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  if (token) {
    ;(headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error" }))
    throw new ApiError(response.status, errorData.detail || "Request failed")
  }

  return response.json()
}

// =====================
// Auth API
// =====================

export interface AuthResponse {
  message: string
  token: string
}

export interface UserProfile {
  email: string
  role: string
  name?: string
  platform?: string
  joinedDate?: string
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  setAuthToken(response.token)
  return response
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  setAuthToken(response.token)
  return response
}

export async function getCurrentUser(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/me")
}

export function logout() {
  clearAuthToken()
}

// =====================
// Score API
// =====================

export interface ProfileInput {
  user_id: string
  platform_name: string
  task_completion_rate: number
  gps_consistency: number
  customer_rating: number
  platform_diversity: number
  daily_earnings: number[]
}

export interface ScoreResult {
  score: number
  model_used: "baseline" | "ml"
  explanation: string[]
}

export interface ScoreHistoryItem {
  score_value: number
  model_used: string
  explanation: string[]
  created_at: string
  expires_at: string
}

export interface ScoreHistoryResponse {
  history: ScoreHistoryItem[]
}

export async function calculateScore(profile: ProfileInput): Promise<ScoreResult> {
  return apiFetch<ScoreResult>("/score/calculate", {
    method: "POST",
    body: JSON.stringify(profile),
  })
}

export async function getScoreHistory(): Promise<ScoreHistoryResponse> {
  return apiFetch<ScoreHistoryResponse>("/score/history")
}

export async function getCurrentScore(): Promise<ScoreHistoryItem | null> {
  const { history } = await getScoreHistory()
  return history.length > 0 ? history[0] : null
}

// =====================
// Simulation API
// =====================

export interface SimulationResult {
  cached: boolean
  score: number
  model_used: "baseline" | "ml"
  explanation: string[]
}

export async function simulateScore(profile: ProfileInput): Promise<SimulationResult> {
  return apiFetch<SimulationResult>("/simulate", {
    method: "POST",
    body: JSON.stringify(profile),
  })
}

// =====================
// Data Upload API
// =====================

export interface UploadResponse {
  message: string
  records_inserted: number
}

export async function uploadCSV(file: File): Promise<UploadResponse> {
  const token = getAuthToken()
  const formData = new FormData()
  formData.append("file", file)

  const headers: HeadersInit = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}/data/upload`, {
    method: "POST",
    headers,
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Upload failed" }))
    throw new ApiError(response.status, errorData.detail || "Upload failed")
  }

  return response.json()
}

// =====================
// User Profiles API
// =====================

export interface UserProfileData {
  user_email: string
  worker_id: string
  platform_name: string
  month: string
  task_completion_rate: number
  gps_consistency: number
  customer_rating: number
  platform_diversity: number
  total_earnings: number
}

export async function getUserProfiles(): Promise<UserProfileData[]> {
  return apiFetch<UserProfileData[]>("/data/profiles")
}

// =====================
// Health Check
// =====================

export async function healthCheck(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>("/health")
}
