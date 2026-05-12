"use client"

import React from "react"

import { useState, useCallback } from "react"
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
  status: "uploading" | "success" | "error"
  progress: number
  category: string
}

const dataCategories = [
  {
    id: "task_logs",
    label: "Task Logs",
    description: "CSV of completed tasks, timestamps, and earnings",
    icon: FileSpreadsheet,
    accepts: ".csv, .xlsx",
    example: "task_id, date, status, earnings",
  },
  {
    id: "gps_data",
    label: "GPS / Location Data",
    description: "GPS traces showing work activity and consistency",
    icon: MapPin,
    accepts: ".csv, .json, .gpx",
    example: "latitude, longitude, timestamp, duration",
  },
  {
    id: "ratings",
    label: "Customer Ratings",
    description: "Customer feedback and rating history export",
    icon: Star,
    accepts: ".csv, .xlsx",
    example: "rating, review_date, customer_id",
  },
  {
    id: "platform_history",
    label: "Platform History",
    description: "Work history from gig platforms (Grab, FoodPanda, etc.)",
    icon: Clock,
    accepts: ".csv, .xlsx, .json",
    example: "platform, start_date, total_tasks, active_days",
  },
]

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("task_logs")

  const simulateUpload = useCallback(
    (file: File) => {
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "uploading",
        progress: 0,
        category: selectedCategory,
      }

      setFiles((prev) => [uploadedFile, ...prev])

      // Simulate upload progress
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 30
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id
                ? { ...f, progress: 100, status: "success" as const }
                : f
            )
          )
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id ? { ...f, progress } : f
            )
          )
        }
      }, 300)
    },
    [selectedCategory]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const droppedFiles = Array.from(e.dataTransfer.files)
      for (const file of droppedFiles) {
        simulateUpload(file)
      }
    },
    [simulateUpload]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles) {
        for (const file of Array.from(selectedFiles)) {
          simulateUpload(file)
        }
      }
      e.target.value = ""
    },
    [simulateUpload]
  )

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Upload Data
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your gig work data to calculate or update your credit score
        </p>
      </div>

      {/* Data Category Selector */}
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
                  selectedCategory === cat.id
                    ? "bg-primary/10"
                    : "bg-muted"
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
              <div className="min-w-0">
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

      {/* Drop Zone */}
      <div
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
          Max file size: 10MB per file
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent border border-accent-foreground/10">
        <Info className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-accent-foreground">
            How your data is used
          </p>
          <p className="text-xs text-accent-foreground/70 mt-1 leading-relaxed">
            Your uploaded data is processed securely to calculate your alternative
            credit score. We use task logs, GPS consistency, customer ratings, and
            platform diversity to build a comprehensive picture of your work
            reliability. All data is encrypted and never shared with third parties.
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
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
                        : "bg-muted"
                  )}
                >
                  {file.status === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : file.status === "error" ? (
                    <AlertCircle className="w-5 h-5 text-destructive" />
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

          {files.some((f) => f.status === "success") && (
            <div className="mt-4 flex justify-end">
              <Button>
                Process Uploaded Data
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
