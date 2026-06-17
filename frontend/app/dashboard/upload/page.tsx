"use client"

import React, { useCallback, useState } from "react"
import { uploadDataFile } from "@/lib/api"
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UploadedFile {
  id: string
  name: string
  size: number
  status: "uploading" | "success" | "error" | "mapping"
  progress: number
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const HOW_IT_WORKS = [
  {
    step: "1",
    emoji: "📁",
    title: "Export your work history",
    body: "Go to your gig app (Grab, FoodPanda, Lalamove, etc.) and download your monthly work report. It's usually under Settings → Reports or Activity History. The file should be in CSV or Excel format.",
  },
  {
    step: "2",
    emoji: "📤",
    title: "Upload the file here",
    body: "Drag your file into the box below or click to browse. You can upload multiple months at once — the more data you provide, the more accurate your score will be.",
  },
  {
    step: "3",
    emoji: "✅",
    title: "We check each month",
    body: "Each month needs at least 10 active working days, 30 completed jobs, and a valid earnings record before it counts toward your score. Months that don't meet this are flagged so you know.",
  },
  {
    step: "4",
    emoji: "📊",
    title: "Your score is updated",
    body: "Once uploaded, your credit score is recalculated. The more months of consistent work you provide, the stronger your score — and the closer you get to an Official GigCredit Score.",
  },
]

const SCORE_TIERS = [
  {
    range: "0 – 2 months",
    label: "Not enough data yet",
    color: "text-destructive",
    dot: "bg-destructive",
    note: "Keep uploading. We need at least 3 months before we can generate a score.",
  },
  {
    range: "3 – 5 months",
    label: "Preliminary Score",
    color: "text-warning",
    dot: "bg-warning",
    note: "A score is generated, but it's early. More data makes it more reliable.",
  },
  {
    range: "6+ months",
    label: "Official GigCredit Score",
    color: "text-success",
    dot: "bg-success",
    note: "Your score is based on solid long-term work history. This is what lenders trust most.",
  },
]

const REQUIREMENTS = [
  { emoji: "📅", label: "At least 10 working days in the month" },
  { emoji: "✅", label: "At least 30 completed jobs or deliveries" },
  { emoji: "💰", label: "Valid earnings recorded for that month" },
]

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [mappingRequired, setMappingRequired] = useState(false)
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([])
  const [missingColumns, setMissingColumns] = useState<string[]>([])
  const [detectedMapping, setDetectedMapping] = useState<Record<string, string>>({})
  const [manualMapping, setManualMapping] = useState<Record<string, string>>({})
  const [validationResults, setValidationResults] = useState<any[]>([])
  const [showHowItWorks, setShowHowItWorks] = useState(true)

  const uploadFile = useCallback(async (file: File) => {
    const uploadedFile: UploadedFile = {
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      status: "uploading",
      progress: 20,
    }

    setFiles((prev) => [uploadedFile, ...prev])
    setMappingRequired(false)
    setManualMapping({})
    setValidationResults([])

    try {
      setFiles((prev) => prev.map((f) => f.id === uploadedFile.id ? { ...f, progress: 60 } : f))

      const res = await uploadDataFile(file)

      if (res.data.status === "mapping_required") {
        setMappingRequired(true)
        setUploadedColumns(res.data.uploaded_columns || [])
        setMissingColumns(res.data.missing_columns || [])
        setDetectedMapping(res.data.detected_mapping || {})
        setFiles((prev) => prev.map((f) => f.id === uploadedFile.id ? { ...f, status: "mapping", progress: 100 } : f))
        return
      }

      if (res.data.validation_results) {
        setValidationResults(res.data.validation_results)
      }

      localStorage.setItem("gigcredit_uploaded", "true")
      setFiles((prev) => prev.map((f) =>
        f.id === uploadedFile.id
          ? { ...f, progress: 100, status: res.data.records_inserted > 0 ? "success" : "error" }
          : f
      ))
    } catch {
      setFiles((prev) => prev.map((f) => f.id === uploadedFile.id ? { ...f, status: "error", progress: 100 } : f))
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(uploadFile)
  }, [uploadFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) Array.from(e.target.files).forEach(uploadFile)
    e.target.value = ""
  }, [uploadFile])

  const handleConfirmMapping = () => {
    const incomplete = missingColumns.some((field) => !manualMapping[field])
    if (incomplete) {
      alert("Please match all missing fields before continuing.")
      return
    }
    alert("Next step: we will send this manual mapping back to the backend.")
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Upload Your Work Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Share your gig work history so we can build your credit score
        </p>
      </div>

      {/* How it works — collapsible */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHowItWorks((v) => !v)}
          className="flex items-center justify-between w-full px-5 py-4 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-card-foreground">How does this work?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Step-by-step guide to getting your score</p>
          </div>
          {showHowItWorks
            ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>

        {showHowItWorks && (
          <div className="border-t border-border px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    {item.emoji} {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* What counts as valid data */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm font-semibold text-card-foreground">What does each month need to qualify?</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Not every month automatically counts. We check that each month shows real, consistent work before it contributes to your score.
        </p>
        <div className="space-y-2">
          {REQUIREMENTS.map((r) => (
            <div key={r.label} className="flex items-center gap-2.5 text-sm">
              <span>{r.emoji}</span>
              <span className="text-card-foreground">{r.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground pt-1 border-t border-border">
          If a month doesn't meet these, it won't count — but we'll tell you exactly why so you can fix it.
        </p>
      </div>

      {/* Score tiers */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm font-semibold text-card-foreground">How many months do I need?</p>
        <div className="space-y-3">
          {SCORE_TIERS.map((tier) => (
            <div key={tier.range} className="flex items-start gap-3">
              <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", tier.dot)} />
              <div>
                <p className="text-sm text-card-foreground">
                  <span className="font-medium">{tier.range}</span>
                  {" — "}
                  <span className={cn("font-medium", tier.color)}>{tier.label}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{tier.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload box */}
      <div>
        <p className="text-sm font-semibold text-card-foreground mb-3">Upload your file</p>
        <div
          data-tour="upload-box"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all cursor-pointer",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
          )}
        >
          <input
            type="file"
            onChange={handleFileInput}
            className="absolute inset-0 opacity-0 cursor-pointer"
            multiple
            accept=".csv,.xlsx,.json"
            aria-label="Upload files"
          />
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-card-foreground text-center">
            Drag and drop your file here
          </p>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            or click to browse from your device
          </p>
          <p className="text-xs text-muted-foreground/60 mt-3">
            Accepted formats: CSV (.csv), Excel (.xlsx), JSON (.json)
          </p>
        </div>
      </div>

      {/* Column mapping */}
      {mappingRequired && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">We need a little help reading your file</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your file uses different column names than what we expect. Just match each item below to the right column from your file — it only takes a moment.
            </p>
          </div>

          <div className="space-y-3">
            {missingColumns.map((field) => (
              <div key={field} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground capitalize">
                    {field.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">Required for your score</p>
                </div>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={manualMapping[field] || ""}
                  onChange={(e) => setManualMapping((prev) => ({ ...prev, [field]: e.target.value }))}
                >
                  <option value="">Select the matching column</option>
                  {uploadedColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {Object.keys(detectedMapping).length > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                These columns were matched automatically:
              </p>
              <div className="space-y-1">
                {Object.entries(detectedMapping).map(([standard, original]) => (
                  <p key={standard} className="text-xs text-muted-foreground">
                    <span className="font-medium capitalize">{standard.replaceAll("_", " ")}</span> → {original}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleConfirmMapping}>
              Confirm and continue
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Validation results */}
      {validationResults.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-card-foreground">Upload Results</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {validationResults.filter(r => r.status === "passed").length} month(s) accepted ·{" "}
              {validationResults.filter(r => r.status === "failed").length} month(s) not accepted
            </p>
          </div>
          <div className="divide-y divide-border">
            {validationResults.map((r, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                {r.status === "passed"
                  ? <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground">
                    {r.month} — {r.platform}
                  </p>
                  {r.status === "passed" ? (
                    <p className="text-xs text-success mt-0.5">
                      ✓ This month's data was accepted and will count toward your score
                    </p>
                  ) : (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-muted-foreground">This month didn't qualify because:</p>
                      {r.reasons.map((reason: string, j: number) => (
                        <p key={j} className="text-xs text-destructive">• {reason}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload file list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                file.status === "success" ? "bg-success/10"
                : file.status === "error"   ? "bg-destructive/10"
                : file.status === "mapping" ? "bg-warning/10"
                : "bg-muted"
              )}>
                {file.status === "success" ? <CheckCircle2 className="w-5 h-5 text-success" />
                : file.status === "error"   ? <AlertCircle className="w-5 h-5 text-destructive" />
                : file.status === "mapping" ? <AlertCircle className="w-5 h-5 text-warning-foreground" />
                : <FileText className="w-5 h-5 text-muted-foreground" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-card-foreground truncate">{file.name}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{formatSize(file.size)}</span>
                </div>

                {file.status === "uploading" && (
                  <div className="mt-2">
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${file.progress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
                  </div>
                )}
                {file.status === "success" && <p className="text-xs text-success mt-0.5">File uploaded successfully</p>}
                {file.status === "mapping" && <p className="text-xs text-warning-foreground mt-0.5">We need help matching some columns — see above</p>}
                {file.status === "error"   && <p className="text-xs text-destructive mt-0.5">Upload failed — please check the file and try again</p>}
              </div>

              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((f) => f.id !== file.id))}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                aria-label={`Remove ${file.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
