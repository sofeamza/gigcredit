"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  X,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const steps = [
  {
    title: "Welcome to GigCredit",
    text: "This quick tour will guide you through the platform.",
    path: "/dashboard/upload",
    target: null,
  },

  {
    title: "Upload Your Gig Data",
    text: "Upload your CSV file here to calculate your score. You need to upload data before viewing the dashboard.",
    path: "/dashboard/upload",
    target: "upload-box",
    requireUpload: true,
  },

  {
    title: "View Your Credit Score",
    text: "Your dashboard shows your overall score and score history.",
    path: "/dashboard",
    target: "dashboard-score",
  },

  {
    title: "Understand Your Score",
    text: "This section explains what helped or reduced your score.",
    path: "/dashboard",
    target: "score-factors",
  },

  {
    title: "Try What-If Simulation",
    text: "Test how improving performance could affect your score.",
    path: "/dashboard/simulation",
    target: "simulation-panel",
  },
]

export function OnboardingPopup() {
  const router = useRouter()
  const pathname = usePathname()

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [highlightRect, setHighlightRect] = useState<any>(null)

  const current = steps[step]

  const uploadComplete =
  typeof window !== "undefined" &&
  localStorage.getItem("gigcredit_uploaded") === "true"

  useEffect(() => {
    const hasSeen = localStorage.getItem("hasSeenOnboarding")

    if (!hasSeen) {
      setOpen(true)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    router.push(current.path)
  }, [step])

  useEffect(() => {
    if (!open) return

    const timeout = setTimeout(() => {
      if (!current.target) {
        setHighlightRect(null)
        return
      }

      const el = document.querySelector(
        `[data-tour="${current.target}"]`
      ) as HTMLElement | null

      if (!el) return

      const rect = el.getBoundingClientRect()

      setHighlightRect({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      })

      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }, 400)

    return () => clearTimeout(timeout)
  }, [step, pathname, open])

  function finishTour() {
    localStorage.setItem("hasSeenOnboarding", "true")
    setOpen(false)
  }

  function nextStep() {
    if (step === steps.length - 1) {
      finishTour()
    } else {
      setStep((prev) => prev + 1)
    }
  }

  function previousStep() {
    if (step > 0) {
      setStep((prev) => prev - 1)
    }
  }

  if (!open) return null

  return (
    <>

      {/* Highlight box */}
      {highlightRect && (
        <div
          className="absolute z-[91] rounded-2xl ring-4 ring-primary animate-pulse pointer-events-none transition-all duration-300"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
          }}
        />
      )}

      {/* Floating guide card */}
      <div className="fixed bottom-6 right-6 z-[100] w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>

            <div>
              <p className="text-sm font-semibold text-card-foreground">
                Guided Tour
              </p>

              <p className="text-xs text-muted-foreground">
                Step {step + 1} of {steps.length}
              </p>
            </div>
          </div>

          <button
            onClick={finishTour}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <h2 className="text-lg font-bold tracking-tight text-card-foreground">
            {current.title}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {current.text}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <Button
                variant="ghost"
                onClick={nextStep}
              >
                Do it later
              </Button>
            )}

            <Button onClick={nextStep}   disabled={(current as any).requireUpload && !uploadComplete}>
              {step === steps.length - 1 ? "Finish" : "Next"}

              {step !== steps.length - 1 && (
                <ArrowRight className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}