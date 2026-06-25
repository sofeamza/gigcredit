"use client"

import { useEffect, useState } from "react"
import { Search, ShieldCheck, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getWorkerScores, logFIAccess } from "@/lib/api"

interface WorkerScore {
  user_email: string
  score_value: number
  model_used: string
  explanation: string[]
  eligibility: "insufficient" | "preliminary" | "official" | null
  months_count: number
  version: number
  created_at: string
}

const ELIGIBILITY_CONFIG = {
  official:     { label: "Official",     className: "bg-success/10 text-success" },
  preliminary:  { label: "Preliminary",  className: "bg-warning/10 text-warning" },
  insufficient: { label: "Insufficient", className: "bg-destructive/10 text-destructive" },
}

interface ShapFactor {
  name: string
  value: number
  positive: boolean
}

const FEATURE_LABELS: Record<string, string> = {
  task_completion_rate: "Task Completion Rate",
  gps_consistency: "GPS Consistency",
  customer_rating: "Customer Rating",
  platform_diversity: "Platform Diversity",
}

function parseExplanation(lines: string[]): ShapFactor[] {
  return lines.map((line) => {
    const match = line.match(/^(\S+)\s+(increased|decreased)\s+your score by ([\d.]+) points/)
    if (!match) return { name: line, value: 0, positive: true }
    return {
      name: FEATURE_LABELS[match[1]] ?? match[1],
      value: parseFloat(match[3]),
      positive: match[2] === "increased",
    }
  })
}

function ShapChart({ factors }: { factors: ShapFactor[] }) {
  const max = Math.max(...factors.map((f) => f.value), 1)
  return (
    <div className="space-y-3">
      {factors.map((f) => (
        <div key={f.name} className="grid grid-cols-[160px_1fr_52px] items-center gap-3">
          <span className="text-xs text-muted-foreground truncate text-right">{f.name}</span>
          <div className="relative h-6 rounded bg-muted/50 overflow-hidden">
            <div
              className={cn(
                "absolute top-0 bottom-0 left-0 rounded transition-all duration-500",
                f.positive ? "bg-success/70" : "bg-destructive/70"
              )}
              style={{ width: `${(f.value / max) * 100}%` }}
            />
            <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-card-foreground">
              {f.positive ? "+" : "−"}{f.value} pts
            </span>
          </div>
          <span className={cn("text-xs font-semibold tabular-nums", f.positive ? "text-success" : "text-destructive")}>
            {f.positive ? "▲" : "▼"}
          </span>
        </div>
      ))}
    </div>
  )
}

function scoreCategory(score: number): { label: string; color: string } {
  if (score >= 700) return { label: "Good", color: "text-success" }
  if (score >= 580) return { label: "Fair", color: "text-warning" }
  return { label: "Poor", color: "text-destructive" }
}

function scoreBadgeClass(score: number) {
  if (score >= 700) return "bg-success/10 text-success"
  if (score >= 580) return "bg-warning/10 text-warning"
  return "bg-destructive/10 text-destructive"
}

export default function FIDashboardPage() {
  const [scores, setScores] = useState<WorkerScore[]>([])
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [logged, setLogged] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWorkerScores()
      .then((res) => setScores(res.data.scores))
      .catch(() => setScores([]))
      .finally(() => setLoading(false))
  }, [])

  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default

    const doc = new jsPDF({ orientation: "landscape" })

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("GigCredit — Worker Credit Score Report", 14, 18)

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleString("en-MY")}  ·  Confidential — For authorised financial institution use only`, 14, 25)
    doc.setTextColor(0)

    const rows = scores.map((s) => [
      s.user_email,
      String(s.score_value),
      s.score_value >= 700 ? "Good" : s.score_value >= 580 ? "Fair" : "Poor",
      s.eligibility
        ? s.eligibility.charAt(0).toUpperCase() + s.eligibility.slice(1)
        : "—",
      s.months_count != null ? `${s.months_count} mo.` : "—",
      s.version ? `v${s.version}` : "—",
      s.model_used ?? "—",
      s.created_at
        ? new Date(s.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
        : "—",
    ])

    autoTable(doc, {
      startY: 32,
      head: [["Worker", "Score", "Category", "Score Status", "Data", "Version", "Model", "Last Updated"]],
      body: rows,
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 248, 255] },
    })

    doc.save(`gigcredit-worker-scores-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const filtered = scores.filter((s) =>
    s.user_email.toLowerCase().includes(search.toLowerCase())
  )

  const good = scores.filter((s) => s.score_value >= 700).length
  const fair = scores.filter((s) => s.score_value >= 580 && s.score_value < 700).length
  const poor = scores.filter((s) => s.score_value < 580).length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Credit Profiles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only view of worker credit scores and SHAP explanations
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={downloadPDF}
          disabled={scores.length === 0}
        >
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      {/* Access notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/30">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          You have <span className="text-foreground font-medium">read-only</span> access.
          You can view credit scores and score explanations but cannot modify any data.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Good (≥700)", value: good, color: "text-success" },
          { label: "Fair (580–699)", value: fair, color: "text-warning" },
          { label: "Poor (<580)", value: poor, color: "text-destructive" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={cn("text-2xl font-bold tabular-nums", c.color)}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-border">
          <h2 className="text-sm font-semibold text-card-foreground">
            All Workers ({scores.length})
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading...</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Worker", "Score", "Category", "Score Status", "Data", "Version", "Last Updated", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <>
                    <tr
                      key={s.user_email}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        const next = expanded === s.user_email ? null : s.user_email
                        setExpanded(next)
                        if (next && !logged.has(s.user_email)) {
                          logFIAccess(s.user_email, s.score_value).catch(() => {})
                          setLogged((prev) => new Set(prev).add(s.user_email))
                        }
                      }}
                    >
                      <td className="px-5 py-3.5 text-sm text-card-foreground">
                        {s.user_email}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn("text-sm font-bold tabular-nums", scoreCategory(s.score_value).color)}>
                          {s.score_value}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="secondary" className={cn("text-xs border-0", scoreBadgeClass(s.score_value))}>
                          {scoreCategory(s.score_value).label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {s.eligibility && ELIGIBILITY_CONFIG[s.eligibility] ? (
                          <Badge variant="secondary" className={cn("text-xs border-0 whitespace-nowrap", ELIGIBILITY_CONFIG[s.eligibility].className)}>
                            {ELIGIBILITY_CONFIG[s.eligibility].label}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        {s.months_count ?? "—"} mo.
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        {s.version ? `v${s.version}` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(s.created_at).toLocaleDateString("en-MY", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {expanded === s.user_email ? "▲ Hide" : "▼ SHAP"}
                      </td>
                    </tr>

                    {expanded === s.user_email && (
                      <tr key={`${s.user_email}-exp`} className="border-b border-border bg-muted/20">
                        <td colSpan={8} className="px-5 py-5">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-semibold text-card-foreground uppercase tracking-wider">
                              SHAP Score Breakdown
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-success/70 inline-block" /> Positive impact</span>
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-destructive/70 inline-block" /> Negative impact</span>
                            </div>
                          </div>
                          <ShapChart factors={parseExplanation(s.explanation)} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No worker profiles found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
