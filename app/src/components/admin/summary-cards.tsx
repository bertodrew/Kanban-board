"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, AlertTriangle, DollarSign, Server } from "lucide-react"
import type { ServiceWithUsage } from "@/types"

interface SummaryCardsProps {
  services: ServiceWithUsage[]
}

export function SummaryCards({ services }: SummaryCardsProps) {
  const active = services.filter((s) => s.is_enabled)
  const healthy = active.filter((s) => s.status === "ok")
  const warnings = active.filter(
    (s) => s.status === "warning" || s.status === "critical"
  )
  const totalCost = services.reduce((sum, s) => sum + s.estimated_cost, 0)

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Services</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{active.length}</div>
          <p className="text-xs text-muted-foreground">
            of {services.length} configured
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Healthy</CardTitle>
          <Activity className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {healthy.length}
          </div>
          <p className="text-xs text-muted-foreground">under threshold</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Warnings</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {warnings.length}
          </div>
          <p className="text-xs text-muted-foreground">
            above threshold or at limit
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Est. Monthly Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totalCost.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">based on current usage</p>
        </CardContent>
      </Card>
    </div>
  )
}
