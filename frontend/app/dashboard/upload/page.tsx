"use client"

import React, { useCallback, useState } from "react"
import { uploadDataFile } from "@/lib/api"
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  MapPin,
  Star,
  Clock,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"



interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  status: "uploading" | "success" | "error" | "mapping"
  progress: number
  category: string
}

const dataCategories = [
  {
    id: "task_logs",
    label: "Task Logs",
    description: "Completed tasks, timestamps, and earnings",
    icon: FileSpreadsheet,
    accepts: ".csv, .xlsx",
  },
  {
    id: "gps_data",
    label: "GPS / Location Data",
    description: "GPS traces showing work activity and consistency",
    icon: MapPin,
    accepts: ".csv, .json, .gpx",
  },
  {
    id: "ratings",
    label: "Customer Ratings",
    description: "Customer feedback and rating history export",
    icon: Star,
    accepts: ".csv, .xlsx",
  },
  {
    id: "platform_history",
    label: "Platform History",
    description: "Work history from Grab, FoodPanda, Lalamove, etc.",
    icon: Clock,
    accepts: ".csv, .xlsx, .json",
  },
]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("task_logs")

  const [mappingRequired, setMappingRequired] = useState(false)
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([])
  const [missingColumns, setMissingColumns] = useState<string[]>([])
  const [detectedMapping, setDetectedMapping] = useState<Record<string, string>>({})
  const [manualMapping, setManualMapping] = useState<Record<string, string>>({})

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const uploadFile = useCallback(
    async (file: File) => {
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "uploading",
        progress: 20,
        category: selectedCategory,
      }

      setFiles((prev) => [uploadedFile, ...prev])
      setMappingRequired(false)
      setManualMapping({})

      try {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, progress: 60 } : f
          )
        )

        const res = await uploadDataFile(file)

        if (res.data.status === "mapping_required") {
          setMappingRequired(true)
          setUploadedColumns(res.data.uploaded_columns || [])
          setMissingColumns(res.data.missing_columns || [])
          setDetectedMapping(res.data.detected_mapping || {})

          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id
                ? { ...f, status: "mapping", progress: 100 }
                : f
            )
          )

          return
        }

        localStorage.setItem("gigcredit_uploaded", "true")

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, progress: 100, status: "success" }
              : f
          )
        )
      } catch (error) {
        console.error("Upload failed:", error)

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: "error", progress: 100 }
              : f
          )
        )
      }
    },
    [selectedCategory]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      droppedFiles.forEach((file) => uploadFile(file))
    },
    [uploadFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files

      if (selectedFiles) {
        Array.from(selectedFiles).forEach((file) => uploadFile(file))
      }

      e.target.value = ""
    },
    [uploadFile]
  )

  const handleConfirmMapping = () => {
    const incomplete = missingColumns.some((field) => !manualMapping[field])

    if (incomplete) {
      alert("Please match all missing fields before continuing.")
      return
    }

    alert("Next step: we will send this manual mapping back to the backend.")
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Upload Data
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your gig work data to calculate or update your credit score
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-foreground mb-3">
          Select Data Category
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dataCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
                selectedCategory === cat.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                  selectedCategory === cat.id ? "bg-primary/10" : "bg-muted"
                )}
              >
                <cat.icon
                  className={cn(
                    "w-5 h-5",
                    selectedCategory === cat.id
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-card-foreground">
                  {cat.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {cat.description}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Accepts: {cat.accepts}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div
        data-tour="upload-box"
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
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
          accept=".csv,.xlsx,.json,.gpx"
          aria-label="Upload files"
        />

        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <Upload className="w-6 h-6 text-primary" />
        </div>

        <p className="text-sm font-medium text-card-foreground text-center">
          Drag and drop your files here
        </p>
        <p className="text-xs text-muted-foreground mt-1 text-center">
          or click to browse from your computer
        </p>
        <p className="text-xs text-muted-foreground/60 mt-3">
          Accepted formats: CSV, XLSX, JSON, GPX
        </p>
      </div>

      {mappingRequired && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Help us understand your file
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Some column names were not recognized. Match each required field to
              the correct column from your file.
            </p>
          </div>

          <div className="space-y-3">
            {missingColumns.map((field) => (
              <div
                key={field}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-card-foreground capitalize">
                    {field.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Required for score calculation
                  </p>
                </div>

                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={manualMapping[field] || ""}
                  onChange={(e) =>
                    setManualMapping((prev) => ({
                      ...prev,
                      [field]: e.target.value,
                    }))
                  }
                >
                  <option value="">Select matching column</option>

                  {uploadedColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {Object.keys(detectedMapping).length > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Automatically detected columns:
              </p>

              <div className="space-y-1">
                {Object.entries(detectedMapping).map(([standard, original]) => (
                  <p key={standard} className="text-xs text-muted-foreground">
                    <span className="font-medium">
                      {standard.replaceAll("_", " ")}
                    </span>{" "}
                    → {original}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleConfirmMapping}>
              Confirm Mapping
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent border border-accent-foreground/10">
        <Info className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-accent-foreground">
            How your data is used
          </p>
          <p className="text-xs text-accent-foreground/70 mt-1 leading-relaxed">
            Your uploaded data is processed securely to calculate your
            alternative credit score. We use task logs, GPS consistency,
            customer ratings, and platform diversity to understand your work
            reliability.
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">
            Uploaded Files ({files.length})
          </h2>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                    file.status === "success"
                      ? "bg-success/10"
                      : file.status === "error"
                      ? "bg-destructive/10"
                      : file.status === "mapping"
                      ? "bg-warning/10"
                      : "bg-muted"
                  )}
                >
                  {file.status === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : file.status === "error" ? (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  ) : file.status === "mapping" ? (
                    <AlertCircle className="w-5 h-5 text-warning-foreground" />
                  ) : (
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-card-foreground truncate">
                      {file.name}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatSize(file.size)}
                    </span>
                  </div>

                  {file.status === "uploading" && (
                    <div className="mt-2">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploading... {Math.round(file.progress)}%
                      </p>
                    </div>
                  )}

                  {file.status === "success" && (
                    <p className="text-xs text-success mt-0.5">
                      Upload complete
                    </p>
                  )}

                  {file.status === "mapping" && (
                    <p className="text-xs text-warning-foreground mt-0.5">
                      Column matching required
                    </p>
                  )}

                  {file.status === "error" && (
                    <p className="text-xs text-destructive mt-0.5">
                      Upload failed. Please try again.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}