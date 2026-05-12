"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import type { ScoreHistory } from "@/lib/mock-data"

interface ScoreHistoryChartProps {
  data: ScoreHistory[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-card-foreground">
          Score: {payload[0].value}
        </p>
      </div>
    )
  }
  return null
}

export function ScoreHistoryChart({ data }: ScoreHistoryChartProps) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        >
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(162, 63%, 41%)"
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor="hsl(162, 63%, 41%)"
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
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(220, 10%, 46%)", fontSize: 12 }}
            dy={8}
          />
          <YAxis
            domain={[300, 850]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(220, 10%, 46%)", fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="hsl(162, 63%, 41%)"
            strokeWidth={2.5}
            fill="url(#scoreGradient)"
            dot={{ r: 4, fill: "hsl(162, 63%, 41%)", strokeWidth: 2, stroke: "hsl(0, 0%, 100%)" }}
            activeDot={{ r: 6, fill: "hsl(162, 63%, 41%)", strokeWidth: 2, stroke: "hsl(0, 0%, 100%)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
