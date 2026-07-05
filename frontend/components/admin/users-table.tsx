"use client"

import { useState } from "react"
import { Search, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface User {
  id: string
  name: string
  email: string
  role: string
  lastActive: string | null
  status: "active" | "inactive"
}

interface AdminUsersTableProps {
  users: User[]
}

function UserSection({ title, users, search }: { title: string; users: User[]; search: string }) {
  const [open, setOpen] = useState(true)

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title} ({users.length})
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto] px-5 py-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</span>
          </div>

          {filtered.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground text-center">No users found.</p>
          ) : (
            filtered.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[1fr_auto] items-center px-5 py-3.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                  {user.lastActive
                    ? new Date(user.lastActive).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </span>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const [search, setSearch] = useState("")

  const gigWorkers = users.filter((u) => u.role === "worker" || u.role === "gig_worker" || !u.role || u.role === "user")
  const institutions = users.filter((u) => u.role === "financial_institution")

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-border">
        <h2 className="text-sm font-semibold text-card-foreground">Users</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <UserSection title="Gig Workers" users={gigWorkers} search={search} />
      <UserSection title="Financial Institutions" users={institutions} search={search} />
    </div>
  )
}
