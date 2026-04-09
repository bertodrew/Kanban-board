import { createSupabaseAdmin } from "@/lib/supabase/client"

interface LogUsageParams {
  serviceName: string
  operation: string
  units?: number
  sessionId?: string
  customerId?: string
  metadata?: Record<string, unknown>
}

/**
 * Check if a service is within its monthly limit.
 * Returns true if the call is allowed. Graceful degradation: returns true on any error.
 */
export async function checkLimit(serviceName: string): Promise<boolean> {
  try {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase.rpc("check_service_limit", {
      p_service_name: serviceName,
    })
    if (error || !data || data.length === 0) return true
    return data[0].allowed === true
  } catch {
    // Graceful degradation: allow the call if DB is unavailable
    return true
  }
}

/**
 * Log a successful API call. Fire-and-forget — never blocks the caller.
 */
export async function logUsage(params: LogUsageParams): Promise<void> {
  try {
    const supabase = createSupabaseAdmin()
    await supabase.from("service_usage_logs").insert({
      service_name: params.serviceName,
      operation: params.operation,
      units_used: params.units ?? 1,
      session_id: params.sessionId ?? null,
      customer_id: params.customerId ?? null,
      metadata: params.metadata ?? {},
      error: null,
    })
  } catch {
    // Best-effort logging — never fail the primary operation
  }
}

/**
 * Log a failed API call. Does not count toward usage limits.
 */
export async function logError(params: {
  serviceName: string
  operation: string
  error: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = createSupabaseAdmin()
    await supabase.from("service_usage_logs").insert({
      service_name: params.serviceName,
      operation: params.operation,
      units_used: 0,
      metadata: params.metadata ?? {},
      error: params.error,
    })
  } catch {
    // Best-effort logging
  }
}
