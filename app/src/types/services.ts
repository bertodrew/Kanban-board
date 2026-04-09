import { z } from "zod"

// --- Service Limit ---
export const ServiceLimitSchema = z.object({
  service_name: z.string().min(1),
  display_name: z.string().min(1),
  monthly_limit: z.number().int().min(0),
  alert_threshold: z.number().int().min(0).max(100).default(80),
  is_enabled: z.boolean().default(true),
  unit: z.string().min(1),
  cost_per_unit: z.number().min(0),
  notes: z.string().default(""),
  created_at: z.string(),
  updated_at: z.string(),
})
export type ServiceLimit = z.infer<typeof ServiceLimitSchema>

export const UpdateServiceLimitSchema = z.object({
  monthly_limit: z.number().int().min(0).optional(),
  alert_threshold: z.number().int().min(0).max(100).optional(),
  is_enabled: z.boolean().optional(),
  notes: z.string().optional(),
})
export type UpdateServiceLimit = z.infer<typeof UpdateServiceLimitSchema>

// --- Service Usage Log ---
export const ServiceUsageLogSchema = z.object({
  id: z.string(),
  service_name: z.string(),
  operation: z.string(),
  units_used: z.number().int().default(1),
  session_id: z.string().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  error: z.string().nullable().optional(),
  created_at: z.string(),
})
export type ServiceUsageLog = z.infer<typeof ServiceUsageLogSchema>

// --- Monthly Usage (from SQL function) ---
export const MonthlyUsageSchema = z.object({
  total_units: z.number(),
  call_count: z.number(),
  error_count: z.number(),
})
export type MonthlyUsage = z.infer<typeof MonthlyUsageSchema>

// --- Service with computed stats (for API responses) ---
export type ServiceStatus = "ok" | "warning" | "critical" | "disabled"

export interface ServiceWithUsage extends ServiceLimit {
  usage: MonthlyUsage
  usage_percent: number
  status: ServiceStatus
  estimated_cost: number
}

export function computeServiceStatus(
  limit: ServiceLimit,
  usage: MonthlyUsage
): { status: ServiceStatus; usage_percent: number; estimated_cost: number } {
  if (!limit.is_enabled) {
    return { status: "disabled", usage_percent: 0, estimated_cost: 0 }
  }

  const estimated_cost = usage.total_units * limit.cost_per_unit
  const usage_percent =
    limit.monthly_limit > 0
      ? Math.round((usage.total_units / limit.monthly_limit) * 100)
      : 0

  let status: ServiceStatus = "ok"
  if (limit.monthly_limit > 0 && usage.total_units >= limit.monthly_limit) {
    status = "critical"
  } else if (usage_percent >= limit.alert_threshold) {
    status = "warning"
  }

  return { status, usage_percent, estimated_cost }
}
