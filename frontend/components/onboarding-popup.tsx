"use client"

import { useEffect, useState, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowRight, Upload, BarChart3, Layers, CheckCircle2, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Step {
  id: string
  icon: React.ReactNode
  emoji: string
  title: string
  subtitle: string
  text: string
  path: string
  target: string | null
  requireUpload?: boolean
  finalCta?: string
  finalCtaHref?: string
}

const STEPS: Step[] = [
  {
    id: "welcome",
    icon: <Sparkles className="w-6 h-6" />,
    emoji: "👋",
    title: "Welcome to GigCredit",
    subtitle: "Your credit score for gig work",
    text: "GigCredit turns your gig work history into a credit score that lenders actually trust. Let's walk you through how it works — it only takes a minute.",
    path: "/dashboard",
    target: null,
  },
  {
    id: "upload",
    icon: <Upload className="w-6 h-6" />,
    emoji: "📁",
    title: "Upload your work data",
    subtitle: "Required before continuing",
    text: "Drag your CSV or Excel file into the box above. Once uploaded successfully, you can continue to see your credit score.",
    path: "/dashboard/upload",
    target: "upload-box",
    requireUpload: true,
  },
  {
    id: "score",
    icon: <BarChart3 className="w-6 h-6" />,
    emoji: "📊",
    title: "See your credit score",
    subtitle: "Updated after every upload",
    text: "Your dashboard shows your overall credit score and how it has changed over time. 6+ months of data gives you an Official GigCredit Score.",
    path: "/dashboard",
    target: "dashboard-score",
  },
  {
    id: "factors",
    icon: <Layers className="w-6 h-6" />,
    emoji: "🔍",
    title: "Understand what drives it",
    subtitle: "Transparent scoring",
    text: "We show exactly which parts of your work history help or hurt your score — task completion, GPS consistency, ratings, and platform diversity.",
    path: "/dashboard",
    target: "score-factors",
  },
  {
    id: "done",
    icon: <CheckCircle2 className="w-6 h-6" />,
    emoji: "🎉",
    title: "You're all set!",
    subtitle: "Keep uploading every month",
    text: "The more months of consistent work you add, the stronger your score. Upload new data each month to keep it accurate and up to date.",
    path: "/dashboard",
    target: null,
  },
]

const STEP_COLORS = [
  "from-primary/20 to-primary/5",
  "from-blue-500/20 to-blue-500/5",
  "from-violet-500/20 to-violet-500/5",
  "from-cyan-500/20 to-cyan-500/5",
  "from-green-500/20 to-green-500/5",
]

const ICON_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-blue-500 text-white",
  "bg-violet-500 text-white",
  "bg-cyan-500 text-white",
  "bg-green-500 text-white",
]

export function OnboardingPopup() {
  const router = useRouter()
  const pathname = usePathname()

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<"forward" | "back">("forward")
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)
  const [uploaded, setUploaded] = useState(false)

  const current = STEPS[step]

  // Init: must run before the upload-check effect reads localStorage
  useEffect(() => {
    const hasSeen = localStorage.getItem("hasSeenOnboarding")
    const isNewUser = localStorage.getItem("gigcredit_new_user")
    if (!hasSeen || isNewUser) {
      localStorage.removeItem("gigcredit_uploaded")
      localStorage.removeItem("gigcredit_new_user")
      setOpen(true)
    }
  }, [])

  // Poll for upload completion — only while the tour is open and on the upload step
  useEffect(() => {
    if (!open || !current.requireUpload || uploaded) return
    const check = () => {
      if (localStorage.getItem("gigcredit_uploaded") === "true") {
        setUploaded(true)
        // The result popup takes over the screen at this point — drop the
        // spotlight so it doesn't stay glued to the upload box behind it.
        setHighlightRect(null)
      }
    }
    const interval = setInterval(check, 800)
    return () => clearInterval(interval)
  }, [open, current.requireUpload, uploaded])

  // Navigate to the step's page
  useEffect(() => {
    if (!open) return
    router.push(current.path)
  }, [step, open])

  // Find and highlight the target element
  const updateHighlight = useCallback(() => {
    if (!current.target || (current.requireUpload && uploaded)) {
      setHighlightRect(null)
      return
    }
    const el = document.querySelector(`[data-tour="${current.target}"]`) as HTMLElement | null
    if (!el) return
    const rect = el.getBoundingClientRect()
    setHighlightRect(rect)
    el.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [current.target, current.requireUpload, uploaded])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(updateHighlight, 500)
    return () => clearTimeout(t)
  }, [step, pathname, open, updateHighlight])

  useEffect(() => {
    if (!open || !current.target) return
    const onScroll = () => updateHighlight()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [open, current.target, updateHighlight])

  function finish() {
    localStorage.setItem("hasSeenOnboarding", "true")
    setOpen(false)
    setHighlightRect(null)
  }

  function goTo(nextStep: number, dir: "forward" | "back") {
    if (animating) return
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => {
      setStep(nextStep)
      setAnimating(false)
    }, 180)
  }

  function next() {
    if (step === STEPS.length - 1) {
      finish()
    } else {
      goTo(step + 1, "forward")
    }
  }

  function back() {
    if (step > 0) goTo(step - 1, "back")
  }

  if (!open) return null

  const hasHighlight = !!highlightRect && !!current.target
  const pad = 10
  const isUploadStep = current.requireUpload
  const nextBlocked = isUploadStep && !uploaded

  return (
    <>
      {/* Dark overlay — 4 panels around the spotlight so the target stays clickable */}
      {hasHighlight ? (
        <>
          {/* top */}
          <div className="fixed z-[90] left-0 right-0 top-0 pointer-events-auto"
            style={{ height: highlightRect!.top - pad, background: "rgba(0,0,0,0.55)" }} />
          {/* bottom */}
          <div className="fixed z-[90] left-0 right-0 bottom-0 pointer-events-auto"
            style={{ top: highlightRect!.bottom + pad, background: "rgba(0,0,0,0.55)" }} />
          {/* left */}
          <div className="fixed z-[90] top-0 bottom-0 left-0 pointer-events-auto"
            style={{ width: highlightRect!.left - pad, top: highlightRect!.top - pad, height: highlightRect!.height + pad * 2, background: "rgba(0,0,0,0.55)" }} />
          {/* right */}
          <div className="fixed z-[90] top-0 bottom-0 right-0 pointer-events-auto"
            style={{ left: highlightRect!.right + pad, top: highlightRect!.top - pad, height: highlightRect!.height + pad * 2, background: "rgba(0,0,0,0.55)" }} />
          {/* spotlight border ring */}
          <div className="fixed z-[91] rounded-xl pointer-events-none transition-all duration-500"
            style={{
              top: highlightRect!.top - pad,
              left: highlightRect!.left - pad,
              width: highlightRect!.width + pad * 2,
              height: highlightRect!.height + pad * 2,
              boxShadow: "0 0 0 3px hsl(var(--primary))",
            }} />
        </>
      ) : (
        <div className="fixed inset-0 z-[90]" style={{ background: "rgba(0,0,0,0.55)" }} />
      )}

      {/* Tour card */}
      <div className="fixed bottom-6 right-6 z-[100] w-[360px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">

        {/* Gradient header */}
        <div className={cn("relative px-5 pt-5 pb-4 bg-gradient-to-br", STEP_COLORS[step])}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl shrink-0", ICON_COLORS[step])}>
              {current.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{current.subtitle}</p>
              <p className="text-base font-bold text-foreground leading-tight">{current.title}</p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  // Can only go back or to already-unlocked steps
                  if (i < step) goTo(i, "back")
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step
                    ? "w-6 bg-primary"
                    : i < step
                    ? "w-1.5 bg-primary/40 hover:bg-primary/60 cursor-pointer"
                    : "w-1.5 bg-border cursor-default"
                )}
                aria-label={`Step ${i + 1}`}
              />
            ))}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {step + 1} / {STEPS.length}
            </span>
          </div>
        </div>

        {/* Body */}
        <div
          className="px-5 py-4 transition-all duration-180"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? direction === "forward" ? "translateX(12px)" : "translateX(-12px)"
              : "translateX(0)",
          }}
        >
          <div className="text-3xl mb-2">{current.emoji}</div>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.text}</p>

          {/* Upload waiting state */}
          {isUploadStep && (
            <div className={cn(
              "mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium",
              uploaded
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
            )}>
              {uploaded ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Upload complete! Click Next to continue.
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  Waiting for your upload...
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 pb-5">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={back} className="flex-none">
              Back
            </Button>
          )}

          <div className="flex-1" />

          <Button
            size="sm"
            onClick={next}
            disabled={nextBlocked}
            className="gap-2"
            title={nextBlocked ? "Upload a file above to continue" : undefined}
          >
            {step === STEPS.length - 1 ? "Done" : "Next"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </>
  )
}
