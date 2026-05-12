"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Cell,
} from "recharts"
import type { AdminStats } from "@/lib/mock-data"

interface AdminChartsProps {
  stats: AdminStats
}

const barColors = [
  "hsl(0, 72%, 51%)",
  "hsl(43, 96%, 56%)",
  "hsl(162, 63%, 41%)",
  "hsl(142, 71%, 45%)",
]

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-card-foreground">
          {payload[0].value.toLocaleString()}{" "}
          {payload[0].dataKey === "users" ? "users" : "workers"}
        </p>
      </div>
    )
  }
  return null
}

export function AdminCharts({ stats }: AdminChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Score Distribution */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-card-foreground mb-4">
          Score Distribution
        </h2>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats.scoreDistribution}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(214, 20%, 90%)"
              />
              <XAxis
                dataKey="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(220, 10%, 46%)", fontSize: 11 }}
                dy={8}
                tickFormatter={(value: string) => value.split(" ")[0]}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(220, 10%, 46%)", fontSize: 11 }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stats.scoreDistribution.map((_, index) => (
                  <Cell
                    key={`cell-${
                      // biome-ignore lint: index key ok for static data
                      index
                    }`}
                    fill={barColors[index % barColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Growth */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-card-foreground mb-4">
          User Growth
        </h2>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={stats.userGrowth}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="userGrowthGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="hsl(199, 89%, 48%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(199, 89%, 48%)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(214, 20%, 90%)"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(220, 10%, 46%)", fontSize: 11 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(220, 10%, 46%)", fontSize: 11 }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="users"
                stroke="hsl(199, 89%, 48%)"
                strokeWidth={2.5}
                fill="url(#userGrowthGradient)"
                dot={{
                  r: 4,
                  fill: "hsl(199, 89%, 48%)",
                  strokeWidth: 2,
                  stroke: "hsl(0, 0%, 100%)",
                }}
                activeDot={{
                  r: 6,
                  fill: "hsl(199, 89%, 48%)",
                  strokeWidth: 2,
                  stroke: "hsl(0, 0%, 100%)",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
