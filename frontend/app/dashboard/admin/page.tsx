"use client"

import { AdminStatsCards } from "@/components/admin/stats-cards"
import { AdminCharts } from "@/components/admin/admin-charts"
import { AdminUsersTable } from "@/components/admin/users-table"
import { SystemHealth } from "@/components/admin/system-health"
import { mockAdminStats } from "@/lib/mock-data"

export default function AdminPage() {
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
