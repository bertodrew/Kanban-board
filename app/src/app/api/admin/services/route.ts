import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/supabase/client"
import { UpdateServiceLimitSchema, computeServiceStatus } from "@/types"
import type { ServiceLimit, MonthlyUsage, ServiceWithUsage } from "@/types"

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()

    const { data: services, error } = await supabase
      .from("service_limits")
      .select("*")
      .order("display_name")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result: ServiceWithUsage[] = await Promise.all(
      (services as ServiceLimit[]).map(async (svc) => {
        const { data: usageData } = await supabase.rpc("get_monthly_usage", {
          p_service_name: svc.service_name,
        })

        const usage: MonthlyUsage = usageData?.[0]
          ? {
              total_units: Number(usageData[0].total_units),
              call_count: Number(usageData[0].call_count),
              error_count: Number(usageData[0].error_count),
            }
          : { total_units: 0, call_count: 0, error_count: 0 }

        const computed = computeServiceStatus(svc, usage)

        return { ...svc, usage, ...computed }
      })
    )

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { service_name, ...updates } = body as Record<string, unknown>

  if (!service_name || typeof service_name !== "string") {
    return NextResponse.json(
      { error: "Missing service_name" },
      { status: 400 }
    )
  }

  const parsed = UpdateServiceLimitSchema.safeParse(updates)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid updates", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from("service_limits")
      .update(parsed.data)
      .eq("service_name", service_name)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
