import { Server, Database, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

interface SystemHealthProps {
  health: {
    api: "healthy" | "warning" | "error"
    database: "healthy" | "warning" | "error"
    ml: "healthy" | "warning" | "error"
  }
}

const statusConfig = {
  healthy: {
    dot: "bg-success",
    label: "Operational",
    textColor: "text-success",
  },
  warning: {
    dot: "bg-warning",
    label: "Degraded",
    textColor: "text-warning-foreground",
  },
  error: {
    dot: "bg-destructive",
    label: "Down",
    textColor: "text-destructive",
  },
}

export function SystemHealth({ health }: SystemHealthProps) {
  const services = [
    { key: "api" as const, label: "API Server", icon: Server },
    { key: "database" as const, label: "Database", icon: Database },
    { key: "ml" as const, label: "ML Pipeline", icon: Brain },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-card-foreground mb-4">
        System Health
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {services.map((service) => {
          const status = health[service.key]
          const config = statusConfig[status]
          return (
            <div
              key={service.key}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <service.icon className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium text-card-foreground">
                  {service.label}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn("w-2 h-2 rounded-full", config.dot)}
                  />
                  <span className={cn("text-xs font-medium", config.textColor)}>
                    {config.label}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
