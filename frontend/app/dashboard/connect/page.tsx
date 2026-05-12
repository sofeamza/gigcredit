"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Link2,
  Unlink,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Clock,
  FileText,
  MapPin,
  Star,
  AlertTriangle,
  Info,
  ExternalLink,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Platform {
  id: string
  name: string
  logo: string
  color: string
  bgColor: string
  description: string
  dataPoints: string[]
  status: "disconnected" | "connecting" | "authorizing" | "syncing" | "connected"
  lastSynced?: string
  recordCount?: number
}

const initialPlatforms: Platform[] = [
  {
    id: "grab",
    name: "Grab",
    logo: "G",
    color: "hsl(142, 71%, 45%)",
    bgColor: "hsl(142, 71%, 45%)",
    description: "Ride-hailing, food delivery, and parcel services",
    dataPoints: ["Task completion logs", "GPS traces", "Customer ratings", "Earnings history"],
    status: "disconnected",
  },
  {
    id: "foodpanda",
    name: "FoodPanda",
    logo: "FP",
    color: "hsl(330, 80%, 55%)",
    bgColor: "hsl(330, 80%, 55%)",
    description: "Food and grocery delivery platform",
    dataPoints: ["Delivery records", "Ratings & reviews", "Active hours", "Order history"],
    status: "disconnected",
  },
  {
    id: "lalamove",
    name: "Lalamove",
    logo: "LL",
    color: "hsl(30, 90%, 55%)",
    bgColor: "hsl(30, 90%, 55%)",
    description: "On-demand delivery and logistics",
    dataPoints: ["Delivery logs", "GPS consistency", "Completion rate", "Client feedback"],
    status: "disconnected",
  },
  {
    id: "shopeefood",
    name: "ShopeeFood",
    logo: "SF",
    color: "hsl(15, 90%, 55%)",
    bgColor: "hsl(15, 90%, 55%)",
    description: "Food delivery via Shopee ecosystem",
    dataPoints: ["Order fulfillment", "Response times", "User ratings", "Active days"],
    status: "disconnected",
  },
]

const oauthSteps = [
  { key: "connecting", label: "Connecting to platform..." },
  { key: "authorizing", label: "Waiting for authorization..." },
  { key: "syncing", label: "Syncing your data..." },
]

export default function ConnectPage() {
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms)
  const [oauthModal, setOauthModal] = useState<string | null>(null)
  const [oauthStep, setOauthStep] = useState(0)

  const connectedCount = platforms.filter((p) => p.status === "connected").length

  const simulateOAuth = useCallback((platformId: string) => {
    setOauthModal(platformId)
    setOauthStep(0)

    // Step 1: connecting
    setPlatforms((prev) =>
      prev.map((p) =>
        p.id === platformId ? { ...p, status: "connecting" as const } : p
      )
    )

    // Step 2: authorizing (after 1.2s)
    setTimeout(() => {
      setOauthStep(1)
      setPlatforms((prev) =>
        prev.map((p) =>
          p.id === platformId ? { ...p, status: "authorizing" as const } : p
        )
      )
    }, 1200)

    // Step 3: syncing (after 2.8s)
    setTimeout(() => {
      setOauthStep(2)
      setPlatforms((prev) =>
        prev.map((p) =>
          p.id === platformId ? { ...p, status: "syncing" as const } : p
        )
      )
    }, 2800)

    // Step 4: done (after 4.5s)
    setTimeout(() => {
      setPlatforms((prev) =>
        prev.map((p) =>
          p.id === platformId
            ? {
                ...p,
                status: "connected" as const,
                lastSynced: new Date().toLocaleString(),
                recordCount: Math.floor(Math.random() * 300) + 150,
              }
            : p
        )
      )
      setOauthModal(null)
    }, 4500)
  }, [])

  const disconnectPlatform = useCallback((platformId: string) => {
    setPlatforms((prev) =>
      prev.map((p) =>
        p.id === platformId
          ? { ...p, status: "disconnected" as const, lastSynced: undefined, recordCount: undefined }
          : p
      )
    )
  }, [])

  const resyncPlatform = useCallback((platformId: string) => {
    setPlatforms((prev) =>
      prev.map((p) =>
        p.id === platformId ? { ...p, status: "syncing" as const } : p
      )
    )
    setTimeout(() => {
      setPlatforms((prev) =>
        prev.map((p) =>
          p.id === platformId
            ? {
                ...p,
                status: "connected" as const,
                lastSynced: new Date().toLocaleString(),
                recordCount: Math.floor(Math.random() * 300) + 150,
              }
            : p
        )
      )
    }, 2000)
  }, [])

  const activePlatform = platforms.find((p) => p.id === oauthModal)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Connect Platforms
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Link your gig platform accounts to automatically sync your work data
        </p>
      </div>

      {/* Status overview */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
          <Link2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-card-foreground">
            {connectedCount} of {platforms.length} platforms connected
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            More connections improve your credit score through platform diversity
          </p>
        </div>
        <div className="flex gap-1.5">
          {platforms.map((p) => (
            <div
              key={p.id}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-colors",
                p.status === "connected" ? "bg-primary" : "bg-border"
              )}
              title={`${p.name}: ${p.status}`}
            />
          ))}
        </div>
      </div>

      {/* Mock disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Prototype Demo Mode
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            This is a simulated OAuth integration for demonstration purposes. In a production
            system, this would securely connect to each platform&apos;s API via OAuth 2.0 to fetch
            real work data. Due to platform API restrictions and legal agreements required for
            third-party access, this prototype uses a mock flow to illustrate the intended user
            experience. You can use the{" "}
            <a href="/dashboard/upload" className="text-primary underline underline-offset-2">
              Manual Upload
            </a>{" "}
            page to provide data manually instead.
          </p>
        </div>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className={cn(
              "rounded-xl border bg-card overflow-hidden transition-all",
              platform.status === "connected"
                ? "border-primary/30 ring-1 ring-primary/10"
                : "border-border"
            )}
          >
            {/* Card header */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold shrink-0"
                    style={{
                      backgroundColor: platform.bgColor,
                      color: "white",
                    }}
                  >
                    {platform.logo}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">
                      {platform.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {platform.description}
                    </p>
                  </div>
                </div>
                {platform.status === "connected" && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      Connected
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Data points */}
            <div className="px-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Data fetched:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {platform.dataPoints.map((dp) => (
                  <span
                    key={dp}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground"
                  >
                    {dp}
                  </span>
                ))}
              </div>
            </div>

            {/* Connected info */}
            {platform.status === "connected" && (
              <div className="mx-4 mb-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Last synced
                  </span>
                  <span className="text-card-foreground font-medium">
                    {platform.lastSynced}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1.5">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    Records synced
                  </span>
                  <span className="text-card-foreground font-medium">
                    {platform.recordCount} records
                  </span>
                </div>
              </div>
            )}

            {/* Syncing state */}
            {platform.status === "syncing" && !oauthModal && (
              <div className="mx-4 mb-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground">
                    Re-syncing data from {platform.name}...
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-4 pb-4">
              {platform.status === "disconnected" && (
                <Button
                  className="w-full"
                  onClick={() => simulateOAuth(platform.id)}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Connect with {platform.name}
                </Button>
              )}
              {platform.status === "connected" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => resyncPlatform(platform.id)}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Re-sync
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive bg-transparent"
                    onClick={() => disconnectPlatform(platform.id)}
                  >
                    <Unlink className="w-3.5 h-3.5 mr-1.5" />
                    Disconnect
                  </Button>
                </div>
              )}
              {(platform.status === "connecting" ||
                platform.status === "authorizing" ||
                platform.status === "syncing") &&
                oauthModal === platform.id && (
                  <Button disabled className="w-full">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </Button>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          How Platform Connection Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "Authorize Access",
              description:
                "Click Connect to open a secure OAuth 2.0 authorization window. You grant read-only access to your work data.",
              icon: ShieldCheck,
            },
            {
              step: "2",
              title: "Data Sync",
              description:
                "GigCredit fetches your task logs, GPS traces, ratings, and earnings history from the platform's API.",
              icon: RefreshCw,
            },
            {
              step: "3",
              title: "Score Calculation",
              description:
                "Your data is processed through the dual-model scoring engine (Baseline + ML) to compute your credit score.",
              icon: Star,
            },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {item.step}
                </div>
                <item.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-card-foreground">
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* OAuth modal overlay */}
      {oauthModal && activePlatform && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: activePlatform.bgColor,
                    color: "white",
                  }}
                >
                  {activePlatform.logo}
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">
                    Connect to {activePlatform.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    OAuth 2.0 Authorization Flow
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOauthModal(null)
                  setPlatforms((prev) =>
                    prev.map((p) =>
                      p.id === oauthModal && p.status !== "connected"
                        ? { ...p, status: "disconnected" as const }
                        : p
                    )
                  )
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Cancel connection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* OAuth steps */}
            <div className="p-6 space-y-5">
              {/* Simulated browser bar */}
              <div className="rounded-lg border border-border bg-muted/50 p-2.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span className="font-mono truncate">
                    https://auth.{activePlatform.id}.com/oauth/authorize?client_id=gigcredit&scope=read
                  </span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </div>
              </div>

              {/* Steps progress */}
              <div className="space-y-3">
                {oauthSteps.map((step, idx) => (
                  <div key={step.key} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-all",
                        idx < oauthStep
                          ? "bg-primary"
                          : idx === oauthStep
                            ? "bg-primary/20 ring-2 ring-primary"
                            : "bg-muted"
                      )}
                    >
                      {idx < oauthStep ? (
                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      ) : idx === oauthStep ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm transition-colors",
                        idx < oauthStep
                          ? "text-card-foreground font-medium"
                          : idx === oauthStep
                            ? "text-card-foreground"
                            : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Permission scope */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs font-medium text-card-foreground">
                  GigCredit is requesting access to:
                </p>
                {activePlatform.dataPoints.map((dp) => (
                  <div key={dp} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground">{dp}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground/60 pt-1 border-t border-border mt-2">
                  Read-only access. GigCredit cannot modify your account.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
