import type { ReactNode } from "react"
import { AppNavbar } from "@/components/app-sidebar"
import { OnboardingPopup } from "@/components/onboarding-popup"

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppNavbar />
      <OnboardingPopup />
      <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  )
}