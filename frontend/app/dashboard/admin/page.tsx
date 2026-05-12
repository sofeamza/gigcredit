"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AdminStatsCards } from "@/components/admin/stats-cards"
import { AdminCharts } from "@/components/admin/admin-charts"
import { AdminUsersTable } from "@/components/admin/users-table"
import { SystemHealth } from "@/components/admin/system-health"
import { mockAdminStats } from "@/lib/mock-data"
import { useAuth } from "@/contexts/auth-context"

export default function AdminPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [authLoading, isAuthenticated, router])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
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

      <AdminStatsCards stats={mockAdminStats} />
      <SystemHealth health={mockAdminStats.systemHealth} />
      <AdminCharts stats={mockAdminStats} />
      <AdminUsersTable users={mockAdminStats.recentUsers} />
    </div>
  )
}
