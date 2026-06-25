"use client"

import { useEffect, useState } from "react"
import { getUploadHistory, deleteUploadBatch } from "@/lib/api"
import { FileText, Trash2, ChevronDown, ChevronUp, ArrowLeft, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface UploadBatch {
  batch_id: string
  filename: string
  uploaded_at: string
  months: { month: string; platform: string }[]
  records_inserted: number
  records_failed: number
}

export default function UploadHistoryPage() {
  const [batches, setBatches] = useState<UploadBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    getUploadHistory()
      .then((res) => setBatches(res.data.batches))
      .catch(() => setBatches([]))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (batchId: string) => {
    setDeleting(batchId)
    try {
      await deleteUploadBatch(batchId)
      setBatches((prev) => prev.filter((b) => b.batch_id !== batchId))
    } catch {
      // silently fail — could show a toast here
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      <div className="flex items-center gap-3">
        <Link href="/dashboard/upload">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to Upload
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Upload History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All your previous uploads. Deleting a batch also removes its data from your score.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : batches.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center gap-3 text-center">
          <FileText className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-medium text-card-foreground">No uploads yet</p>
          <p className="text-xs text-muted-foreground">Once you upload your first file, it will appear here.</p>
          <Link href="/dashboard/upload">
            <Button variant="outline" size="sm" className="mt-2">Upload your first file</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <div key={batch.batch_id} className="rounded-xl border border-border bg-card overflow-hidden">

              {/* Batch header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">{batch.filename}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(batch.uploaded_at).toLocaleDateString("en-MY", {
                      day: "numeric", month: "short", year: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(batch.uploaded_at).toLocaleTimeString("en-MY", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                    {" · "}
                    <span className="text-success">{batch.records_inserted} month{batch.records_inserted !== 1 ? "s" : ""} accepted</span>
                    {batch.records_failed > 0 && (
                      <span className="text-destructive"> · {batch.records_failed} rejected</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === batch.batch_id ? null : batch.batch_id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Show months"
                  >
                    {expanded === batch.batch_id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(batch.batch_id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Delete upload"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Delete confirmation */}
              {confirmDelete === batch.batch_id && (
                <div className="flex items-start gap-3 px-5 py-4 bg-destructive/5 border-t border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Delete this upload?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This will remove {batch.records_inserted} month{batch.records_inserted !== 1 ? "s" : ""} of data from your profile. Your score will be recalculated on your next visit. This cannot be undone.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(batch.batch_id)}
                        disabled={deleting === batch.batch_id}
                      >
                        {deleting === batch.batch_id ? "Deleting..." : "Yes, delete"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDelete(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Months breakdown */}
              {expanded === batch.batch_id && batch.months.length > 0 && (
                <div className="border-t border-border px-5 py-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Months included in this upload</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {batch.months.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs">
                        <span className="font-medium text-card-foreground">{m.month}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{m.platform}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
