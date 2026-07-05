"use client"

import { useEffect, useState } from "react"
import {
  Building2,
  Search,
  Mail,
  Plus,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Activity,
  Users,
  BarChart3,
  Clock,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getFinancialInstitutions,
  createFinancialInstitution,
  updateFIStatus,
  getFIAccessLogs,
} from "@/lib/api"

interface Institution {
  institution_name: string
  email: string
  fi_status: "active" | "suspended"
  created_at: string
  profile_views: number
  suspend_count: number
  reactivate_count: number
}

interface Summary {
  total: number
  active: number
  suspended: number
  total_views: number
}

interface AccessLog {
  fi_email: string
  institution_name: string
  worker_id: string
  score_value: number
  accessed_at: string
}

export default function FinancialInstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, suspended: 0, total_views: 0 })
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [search, setSearch] = useState("")
  const [logSearch, setLogSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [instName, setInstName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const [statusLoading, setStatusLoading] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [fiRes, logRes] = await Promise.all([
        getFinancialInstitutions(),
        getFIAccessLogs(),
      ])
      setInstitutions(fiRes.data.institutions)
      setSummary(fiRes.data.summary)
      setLogs(logRes.data.logs)
    } catch {
      // silently fail — table will show empty state
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setSubmitting(true)
    try {
      await createFinancialInstitution(instName, email, password)
      setInstName("")
      setEmail("")
      setPassword("")
      setShowForm(false)
      loadAll()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? "Failed to create account")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusToggle(inst: Institution) {
    const next = inst.fi_status === "active" ? "suspended" : "active"
    setStatusLoading(inst.email)
    try {
      await updateFIStatus(inst.email, next)
      setInstitutions((prev) =>
        prev.map((i) =>
          i.email === inst.email
            ? {
                ...i,
                fi_status: next,
                suspend_count: next === "suspended" ? (i.suspend_count ?? 0) + 1 : i.suspend_count,
                reactivate_count: next === "active" ? (i.reactivate_count ?? 0) + 1 : i.reactivate_count,
              }
            : i
        )
      )
      setSummary((s) => ({
        ...s,
        active: next === "active" ? s.active + 1 : s.active - 1,
        suspended: next === "suspended" ? s.suspended + 1 : s.suspended - 1,
      }))
    } catch {
      // no-op
    } finally {
      setStatusLoading(null)
    }
  }

  const filteredInst = institutions.filter(
    (i) =>
      i.institution_name.toLowerCase().includes(search.toLowerCase()) ||
      i.email.toLowerCase().includes(search.toLowerCase())
  )

  const filteredLogs = logs.filter(
    (l) =>
      l.institution_name.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.worker_id.toLowerCase().includes(logSearch.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Financial Institutions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and monitor institutions with read-only access to credit score reports
          </p>
        </div>
        <Button
          onClick={() => { setShowForm((v) => !v); setFormError("") }}
          variant={showForm ? "outline" : "default"}
          className="shrink-0"
        >
          {showForm ? (
            <><X className="w-4 h-4 mr-2" />Cancel</>
          ) : (
            <><Plus className="w-4 h-4 mr-2" />Add Institution</>
          )}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Institutions", value: summary.total, icon: Building2, color: "text-primary" },
          { label: "Active", value: summary.active, icon: CheckCircle2, color: "text-success" },
          { label: "Suspended", value: summary.suspended, icon: Ban, color: "text-destructive" },
          { label: "Total Profile Views", value: summary.total_views, icon: BarChart3, color: "text-warning" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={cn("w-4 h-4", card.color)} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-card-foreground tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Registration form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-4">
            Register New Financial Institution
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="Institution name (e.g. Maybank Credit Dept)"
              value={instName}
              onChange={(e) => setInstName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="sm:col-span-3 flex items-center gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Account"}
              </Button>
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Access level info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-card-foreground">Access Level</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-card-foreground">Read-only</p>
              <p className="text-xs text-muted-foreground mt-0.5">Can view credit profiles and score reports</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-card-foreground">SHAP explanations</p>
              <p className="text-xs text-muted-foreground mt-0.5">Can view score breakdowns and feature explanations</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-card-foreground">No write access</p>
              <p className="text-xs text-muted-foreground mt-0.5">Cannot delete, edit users, or change system settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Institution list */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-card-foreground">
              Registered Institutions ({institutions.length})
            </h2>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search institutions..."
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
                  {["Institution Name", "Email", "Status", "Date Joined", "Profile Views", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInst.map((inst) => (
                  <tr key={inst.email} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-card-foreground">{inst.institution_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">{inst.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs border-0 capitalize",
                          inst.fi_status === "active"
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {inst.fi_status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {inst.created_at
                        ? new Date(inst.created_at).toLocaleDateString("en-MY", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-card-foreground">
                      Viewed {inst.profile_views} profile{inst.profile_views !== 1 ? "s" : ""}
                    </td>
                    <td className="px-5 py-3.5">
                      {(() => {
                        const suspendCount = inst.suspend_count ?? 0
                        const reactivateCount = inst.reactivate_count ?? 0
                        const canSuspend = inst.fi_status === "active" && suspendCount < 2
                        const canReactivate = inst.fi_status === "suspended" && reactivateCount < 1
                        const isActive = inst.fi_status === "active"
                        const isDisabled = statusLoading === inst.email || (isActive ? !canSuspend : !canReactivate)
                        const limitMsg = isActive
                          ? "Maximum of 2 suspensions reached"
                          : "Can only be reactivated once"

                        return (
                          <div title={isDisabled && statusLoading !== inst.email ? limitMsg : undefined}>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isDisabled}
                              onClick={() => handleStatusToggle(inst)}
                              className={cn(
                                "text-xs h-7 bg-transparent",
                                isActive
                                  ? "text-destructive hover:text-destructive"
                                  : "text-success hover:text-success"
                              )}
                            >
                              {statusLoading === inst.email
                                ? "..."
                                : isActive
                                  ? <><Ban className="w-3 h-3 mr-1" />Suspend ({suspendCount}/2)</>
                                  : <><CheckCircle2 className="w-3 h-3 mr-1" />Reactivate ({reactivateCount}/1)</>}
                            </Button>
                          </div>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
                {filteredInst.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No financial institutions registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Access log */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-card-foreground">
              Profile Access Log
            </h2>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Institution", "Worker Viewed", "Score Viewed", "Date / Time"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{log.institution_name}</p>
                      <p className="text-xs text-muted-foreground">{log.fi_email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-card-foreground font-mono">
                    {log.worker_id}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold tabular-nums text-card-foreground">
                    {log.score_value}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {new Date(log.accessed_at).toLocaleString("en-MY", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No access logs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
