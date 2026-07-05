import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token")

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config
})

export const registerUser = (email: string, password: string) => {
  return api.post("/auth/register", { email, password })
}

export const loginUser = (email: string, password: string) => {
  return api.post("/auth/login", { email, password })
}

export const calculateScore = () => {
  return api.post("/score/calculate")
}

export const getScoreHistory = () => {
  return api.get("/score/history")
}

export const getDailyScores = (month: string) => {
  return api.get(`/score/daily?month=${month}`)
}

export const uploadDataFile = (file: File) => {
  const formData = new FormData()
  formData.append("file", file)

  return api.post("/data/upload", formData)
}

export const getMyProfile = () => {
  return api.get("/data/my-profile")
}

export const getUploadHistory = () => api.get("/data/upload-history")

export const deleteUploadBatch = (batchId: string) => api.delete(`/data/upload-history/${batchId}`)

export const getWorkerHistory = (workerEmail: string) => api.get(`/data/worker-history/${encodeURIComponent(workerEmail)}`)

export const runSimulation = (data: any) => {
  return api.post("/simulate", data)
}

export const getAdminStats = () => api.get("/admin/stats")

export const getAdminUsers = () => api.get("/admin/users")

export const deleteUser = (email: string) =>
  api.delete(`/admin/users/${email}`)

export const getCurrentUser = () => api.get("/auth/me")

export const getFinancialInstitutions = () => api.get("/admin/financial-institutions")
export const getWorkerScores = () => api.get("/admin/worker-scores")

export const createFinancialInstitution = (institution_name: string, email: string, password: string) =>
  api.post("/admin/financial-institutions", { institution_name, email, password })

export const updateFIStatus = (email: string, status: "active" | "suspended") =>
  api.patch(`/admin/financial-institutions/${encodeURIComponent(email)}/status`, { status })

export const getFIAccessLogs = () => api.get("/admin/fi-access-logs")

export const logFIAccess = (worker_email: string, score_value: number) =>
  api.post("/admin/fi-access-logs", { worker_email, score_value })

export default api