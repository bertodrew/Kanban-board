"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Settings, Save, X, Loader2 } from "lucide-react"
import { useUpdateServiceMutation } from "@/hooks/use-services"
import { toast } from "sonner"
import type { ServiceWithUsage, ServiceStatus } from "@/types"

interface ServiceCardProps {
  service: ServiceWithUsage
}

const STATUS_CONFIG: Record<
  ServiceStatus,
  { dot: string; label: string; badge: string }
> = {
  ok: { dot: "bg-green-500", label: "OK", badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  warning: { dot: "bg-amber-500", label: "Warning", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  critical: { dot: "bg-red-500", label: "At Limit", badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  disabled: { dot: "bg-gray-400", label: "Disabled", badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
}

function UsageBar({ percent, status }: { percent: number; status: ServiceStatus }) {
  const barColor =
    status === "critical"
      ? "bg-red-500"
      : status === "warning"
        ? "bg-amber-500"
        : status === "disabled"
          ? "bg-gray-400"
          : "bg-green-500"

  return (
    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}

export function ServiceCard({ service: svc }: ServiceCardProps) {
  const [editing, setEditing] = useState(false)
  const [limit, setLimit] = useState(String(svc.monthly_limit))
  const [threshold, setThreshold] = useState(String(svc.alert_threshold))
  const [enabled, setEnabled] = useState(svc.is_enabled)

  const mutation = useUpdateServiceMutation()
  const cfg = STATUS_CONFIG[svc.status]

  function handleEdit() {
    setLimit(String(svc.monthly_limit))
    setThreshold(String(svc.alert_threshold))
    setEnabled(svc.is_enabled)
    setEditing(true)
  }

  async function handleSave() {
    mutation.mutate(
      {
        serviceName: svc.service_name,
        updates: {
          monthly_limit: Number(limit),
          alert_threshold: Number(threshold),
          is_enabled: enabled,
        },
      },
      {
        onSuccess: () => {
          setEditing(false)
          toast.success(`${svc.display_name} updated`)
        },
        onError: (err) => {
          toast.error(err.message)
        },
      }
    )
  }

  return (
    <Card className={svc.status === "disabled" ? "opacity-60" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
          <CardTitle className="text-base font-semibold">
            {svc.display_name}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cfg.badge}>
            {cfg.label}
          </Badge>
          {!editing && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleEdit}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Usage bar */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">
              {svc.usage.total_units.toLocaleString()} / {svc.monthly_limit === 0 ? "∞" : svc.monthly_limit.toLocaleString()} {svc.unit}
            </span>
            <span className="font-medium">
              {svc.monthly_limit > 0 ? `${svc.usage_percent}%` : "unlimited"}
            </span>
          </div>
          <UsageBar percent={svc.usage_percent} status={svc.status} />
        </div>

        {/* Stats row */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{svc.usage.call_count} calls this month</span>
          {svc.usage.error_count > 0 && (
            <span className="text-red-500">{svc.usage.error_count} errors</span>
          )}
          <span className="font-medium text-foreground">
            ${svc.estimated_cost.toFixed(2)}
          </span>
        </div>

        {/* Inline editor */}
        {editing && (
          <div className="border-t pt-3 mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Monthly limit
                </label>
                <Input
                  type="number"
                  min={0}
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="h-8"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  0 = unlimited
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Alert at %
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="h-8"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Enabled</span>
              </label>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => setEditing(false)}
                  disabled={mutation.isPending}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7"
                  onClick={handleSave}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {svc.notes && !editing && (
          <p className="text-xs text-muted-foreground border-t pt-2">
            {svc.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
