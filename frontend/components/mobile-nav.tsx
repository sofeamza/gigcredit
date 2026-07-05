"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  SlidersHorizontal,
  Upload,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Simulation", href: "/dashboard/simulation", icon: SlidersHorizontal },
  { label: "Upload Data", href: "/dashboard/upload", icon: Upload },
  { label: "Admin", href: "/dashboard/admin", icon: ShieldCheck },
]

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="GigCredit" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-base font-semibold tracking-tight text-card-foreground">GigCredit</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {open && (
        <div className="absolute top-14 left-0 right-0 z-50 bg-card border-b border-border shadow-lg">
          <nav className="px-3 py-2">
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
                  onClick={() => setOpen(false)}
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
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Link>
          </nav>
        </div>
      )}
    </div>
  )
}
