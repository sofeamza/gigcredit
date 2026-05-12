import React from "react"
import { AppNavbar } from "@/components/app-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <AppNavbar />
      <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  )
}
