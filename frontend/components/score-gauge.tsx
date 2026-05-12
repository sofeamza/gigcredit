"use client"

import { useEffect, useState } from "react"
import { getScoreColor, getScoreCategory } from "@/lib/mock-data"

interface ScoreGaugeProps {
  score: number
  previousScore?: number
  size?: "sm" | "lg"
}

export function ScoreGauge({
  score,
  previousScore,
  size = "lg",
}: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(300)
  const category = getScoreCategory(score)
  const color = getScoreColor(score)
  const diff = previousScore ? score - previousScore : 0

  const dimensions = size === "lg" ? { w: 260, h: 260, r: 108, sw: 14 } : { w: 160, h: 160, r: 64, sw: 10 }
  const { w, h, r, sw } = dimensions

  const circumference = Math.PI * r
  const minScore = 300
  const maxScore = 850
  const normalizedScore = (animatedScore - minScore) / (maxScore - minScore)
  const offset = circumference - normalizedScore * circumference

  useEffect(() => {
    const duration = 1200
    const start = 300
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(start + (score - start) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [score])

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: w, height: w * 0.65 }}>
        <svg
          width={w}
          height={w * 0.65}
          viewBox={`0 0 ${w} ${h * 0.65}`}
          className="overflow-visible"
        >
          {/* Background arc */}
          <path
            d={describeArc(w / 2, h * 0.55, r, 180, 360)}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={sw}
            strokeLinecap="round"
          />
          {/* Score arc */}
          <path
            d={describeArc(w / 2, h * 0.55, r, 180, 180 + normalizedScore * 180)}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span
            className="font-bold tabular-nums tracking-tight"
            style={{ fontSize: size === "lg" ? 48 : 28, color }}
          >
            {animatedScore}
          </span>
          <span
            className="text-muted-foreground font-medium"
            style={{ fontSize: size === "lg" ? 14 : 11 }}
          >
            out of 850
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center mt-2">
        <span
          className="font-semibold"
          style={{ fontSize: size === "lg" ? 16 : 13, color }}
        >
          {category}
        </span>
        {diff !== 0 && (
          <span
            className={`text-xs font-medium mt-0.5 ${
              diff > 0 ? "text-success" : "text-destructive"
            }`}
          >
            {diff > 0 ? "+" : ""}
            {diff} pts from last month
          </span>
        )}
      </div>
    </div>
  )
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  }
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}
