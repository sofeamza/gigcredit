"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  SlidersHorizontal,
  Upload,
  ShieldCheck,
  LogOut,
  CreditCard,
  Menu,
  X,
  Link2, // This icon is used for the new menu item
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Simulation",
    href: "/dashboard/simulation",
    icon: SlidersHorizontal,
  },
  {
    label: "Connect", // New Item Added Here
    href: "/dashboard/connect",
    icon: Link2,
  },
  {
    label: "Upload Data",
    href: "/dashboard/upload",
    icon: Upload,
  },
  {
    label: "Admin",
    href: "/dashboard/admin",
    icon: ShieldCheck,
  },
]

export function AppNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  // Get user display info
  const displayName = user?.name || user?.email?.split("@")[0] || "User"
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-14 items-center justify-between px-4 md:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <CreditCard className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-semibold tracking-tight text-card-foreground">
              GigCredit
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground">
              Credit Scoring
            </span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))
            const isExactDashboard =
              item.href === "/dashboard" && pathname === "/dashboard"
            const active = isActive || isExactDashboard

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Desktop user section */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-card-foreground leading-none">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                {user?.email || "Worker"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            <span className="sr-only">Sign Out</span>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card absolute w-full left-0 shadow-lg animate-in slide-in-from-top-2">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href))
              const isExactDashboard =
                item.href === "/dashboard" && pathname === "/dashboard"
              const active = isActive || isExactDashboard

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-card-foreground leading-none">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {user?.email || "Worker"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                handleLogout()
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
