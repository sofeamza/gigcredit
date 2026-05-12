"use client"

import { useState } from "react"
import { Search, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getScoreColor, getScoreCategory } from "@/lib/mock-data"

interface User {
  id: string
  name: string
  email: string
  score: number
  platform: string
  lastActive: string
  status: "active" | "inactive"
}

interface AdminUsersTableProps {
  users: User[]
}

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<keyof User>("lastActive")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const filtered = users
    .filter(
      (u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.id.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })

  function handleSort(field: keyof User) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-border">
        <h2 className="text-sm font-semibold text-card-foreground">
          Recent Users ({users.length})
        </h2>
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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {[
                { key: "name" as keyof User, label: "User" },
                { key: "score" as keyof User, label: "Score" },
                { key: "platform" as keyof User, label: "Platform" },
                { key: "lastActive" as keyof User, label: "Last Active" },
                { key: "status" as keyof User, label: "Status" },
              ].map((col) => (
                <th key={col.key} className="text-left px-5 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    {col.label}
                    {sortField === col.key && (
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 transition-transform",
                          sortDir === "asc" && "rotate-180"
                        )}
                      />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: getScoreColor(user.score) }}
                    >
                      {user.score}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getScoreCategory(user.score)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-card-foreground">
                    {user.platform}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-muted-foreground">
                    {new Date(user.lastActive).toLocaleDateString("en-MY", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <Badge
                    variant={
                      user.status === "active" ? "default" : "secondary"
                    }
                    className={cn(
                      "text-xs capitalize",
                      user.status === "active"
                        ? "bg-success/10 text-success hover:bg-success/20 border-0"
                        : "bg-muted text-muted-foreground hover:bg-muted border-0"
                    )}
                  >
                    {user.status}
                  </Badge>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-sm text-muted-foreground"
                >
                  No users found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
