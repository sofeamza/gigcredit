"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { AdminStatsCards } from "@/components/admin/stats-cards"
import { AdminCharts } from "@/components/admin/admin-charts"
import { AdminUsersTable } from "@/components/admin/users-table"
import { SystemHealth } from "@/components/admin/system-health"

const ELIGIBILITY_CONFIG: Record<string, { label: string; className: string }> = {
  official:     { label: "Official",     className: "bg-success/10 text-success" },
  preliminary:  { label: "Preliminary",  className: "bg-warning/10 text-warning" },
  insufficient: { label: "Insufficient", className: "bg-destructive/10 text-destructive" },
}

function WorkerScoresTable({ scores }: { scores: any[] }) {
  const [search, setSearch] = useState("")

  const filtered = scores.filter((s) =>
    s.user_email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-border">
        <h2 className="text-sm font-semibold text-card-foreground">
          Worker Credit Scores ({scores.length})
        </h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search workers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Worker", "Score", "Score Status", "Data", "Version", "Model", "Last Calculated"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const eligCfg = s.eligibility ? ELIGIBILITY_CONFIG[s.eligibility] : null
              const scoreColor =
                s.score_value >= 700 ? "text-success" :
                s.score_value >= 580 ? "text-warning" :
                "text-destructive"

              return (
                <tr key={s.user_email} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 text-sm text-card-foreground">{s.user_email}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn("text-sm font-bold tabular-nums", scoreColor)}>{s.score_value}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {eligCfg ? (
                      <Badge variant="secondary" className={cn("text-xs border-0 whitespace-nowrap", eligCfg.className)}>
                        {eligCfg.label}
                      </Badge>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                    {s.months_count ?? "—"} mo.
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">
                    {s.version ? `v${s.version}` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground capitalize">
                    {s.model_used ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                    {s.created_at
                      ? new Date(s.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No worker scores found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import {
  getAdminStats,
  getAdminUsers,
  getWorkerScores,
} from "@/lib/api"

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [workerScores, setWorkerScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAdminData()
  }, [])

  async function loadAdminData() {
    try {
      const t0 = performance.now()
      const [statsRes, usersRes, scoresRes] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getWorkerScores(),
      ])
      const apiLatency = Math.round(performance.now() - t0)

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
        apiLatency,
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
      setWorkerScores(scoresRes.data.scores ?? [])
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

      <WorkerScoresTable scores={workerScores} />
    </div>
  )
}