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

export const calculateScore = (data: any) => {
  return api.post("/score/calculate", data)
}

export const getScoreHistory = () => {
  return api.get("/score/history")
}

export const uploadDataFile = (file: File) => {
  const formData = new FormData()
  formData.append("file", file)

  return api.post("/data/upload", formData)
}

export const getMyProfile = () => {
  return api.get("/data/my-profile")
}

export const runSimulation = (data: any) => {
  return api.post("/simulate", data)
}

export const getAdminStats = () => api.get("/admin/stats")

export const getAdminUsers = () => api.get("/admin/users")

export const deleteUser = (email: string) =>
  api.delete(`/admin/users/${email}`)

export const getCurrentUser = () => api.get("/auth/me")

export default api