import { Calendar, Briefcase, Mail } from "lucide-react"
import type { GigWorkerProfile, CreditScore } from "@/lib/mock-data"

interface ProfileSummaryProps {
  user: GigWorkerProfile
  score: CreditScore
}

export function ProfileSummary({ user, score }: ProfileSummaryProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {user.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <p className="text-sm font-semibold text-card-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.id}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">{user.email}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">{user.platform}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Joined {new Date(user.joinedDate).toLocaleDateString("en-MY", { month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Model Used</span>
          <span className="font-medium text-card-foreground capitalize">
            {score.modelUsed === "ml" ? "Machine Learning" : "Baseline"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-muted-foreground">Last Calculated</span>
          <span className="font-medium text-card-foreground">
            {new Date(score.calculatedAt).toLocaleDateString("en-MY", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-muted-foreground">Expires</span>
          <span className="font-medium text-card-foreground">
            {new Date(score.expiresAt).toLocaleDateString("en-MY", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
