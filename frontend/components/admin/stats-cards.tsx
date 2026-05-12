import { Users, UserCheck, BarChart3, Zap } from "lucide-react"
import type { AdminStats } from "@/lib/mock-data"

interface AdminStatsCardsProps {
  stats: AdminStats
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  const cards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      change: "+8.4%",
      changePositive: true,
    },
    {
      label: "Active Users",
      value: stats.activeUsers.toLocaleString(),
      icon: UserCheck,
      change: `${((stats.activeUsers / stats.totalUsers) * 100).toFixed(0)}% of total`,
      changePositive: true,
    },
    {
      label: "Average Score",
      value: stats.avgScore.toString(),
      icon: BarChart3,
      change: "Fair range",
      changePositive: false,
    },
    {
      label: "API Latency",
      value: `${stats.apiLatency}ms`,
      icon: Zap,
      change: "Healthy",
      changePositive: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{card.label}</span>
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
              <card.icon className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-card-foreground tracking-tight">
            {card.value}
          </p>
          <p
            className={`text-xs mt-1 ${
              card.changePositive ? "text-success" : "text-muted-foreground"
            }`}
          >
            {card.change}
          </p>
        </div>
      ))}
    </div>
  )
}
