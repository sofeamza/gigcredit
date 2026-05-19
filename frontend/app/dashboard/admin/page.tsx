"use client"

import { useEffect, useState } from "react"

import { AdminStatsCards } from "@/components/admin/stats-cards"
import { AdminCharts } from "@/components/admin/admin-charts"
import { AdminUsersTable } from "@/components/admin/users-table"
import { SystemHealth } from "@/components/admin/system-health"

import {
  getAdminStats,
  getAdminUsers,
} from "@/lib/api"

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAdminData()
  }, [])

  async function loadAdminData() {
    try {
      const statsRes = await getAdminStats()
      const usersRes = await getAdminUsers()

      const formattedUsers = usersRes.data.users.map((user: any, index: number) => ({
        id: user.email || `user-${index}`,
        name: user.email?.split("@")[0] || "Unknown User",
        email: user.email,
        role: user.role,
        status: "active",
        joinedAt: "N/A",
      }))

      const backendStats = statsRes.data

      const formattedStats = {
        totalUsers: backendStats.total_users,
        activeUsers: backendStats.total_users,
        avgScore: backendStats.average_score,
        totalProfiles: backendStats.total_profiles,
        totalScores: backendStats.total_scores,

        scoreDistribution: [
          {
            label: "Poor",
            value: backendStats.score_distribution.poor,
          },
          {
            label: "Fair",
            value: backendStats.score_distribution.fair,
          },
          {
            label: "Good",
            value: backendStats.score_distribution.good,
          },
        ],

        systemHealth: {
            api: backendStats.api_health === "healthy" ? "healthy" : "warning",
            database: "healthy",
            ml: "healthy",
          },

        recentUsers: formattedUsers,
      }

      setStats(formattedStats)
      setUsers(formattedUsers)
    } catch (error) {
      console.error("Failed to load admin data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading admin dashboard...
      </p>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Admin Panel
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          System overview, user management, and monitoring
        </p>
      </div>

      <AdminStatsCards stats={stats} />

      <SystemHealth health={stats.systemHealth} />

      <AdminCharts stats={stats} />

      <AdminUsersTable users={users} />
    </div>
  )
}