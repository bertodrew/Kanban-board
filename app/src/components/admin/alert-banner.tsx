"use client"

import { AlertTriangle } from "lucide-react"
import type { ServiceWithUsage } from "@/types"

interface AlertBannerProps {
  services: ServiceWithUsage[]
}

export function AlertBanner({ services }: AlertBannerProps) {
  const critical = services.filter((s) => s.status === "critical")
  const warning = services.filter((s) => s.status === "warning")

  if (critical.length === 0 && warning.length === 0) return null

  return (
    <div className="space-y-2">
      {critical.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">
              {critical.length} service{critical.length > 1 ? "s" : ""} at limit
            </p>
            <p className="text-sm">
              {critical.map((s) => s.display_name).join(", ")} — API calls
              are being blocked.
            </p>
          </div>
        </div>
      )}
      {warning.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">
              {warning.length} service{warning.length > 1 ? "s" : ""} approaching
              limit
            </p>
            <p className="text-sm">
              {warning.map((s) => s.display_name).join(", ")} — above{" "}
              alert threshold.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
