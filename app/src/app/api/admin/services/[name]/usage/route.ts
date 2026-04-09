import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/supabase/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const days = Number(request.nextUrl.searchParams.get("days") ?? "30")

  try {
    const supabase = createSupabaseAdmin()
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from("service_usage_logs")
      .select("*")
      .eq("service_name", name)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Aggregate by day
    const byDay = new Map<
      string,
      { day: string; calls: number; units: number; errors: number }
    >()

    for (const row of data ?? []) {
      const day = row.created_at.slice(0, 10)
      const entry = byDay.get(day) ?? { day, calls: 0, units: 0, errors: 0 }
      entry.calls++
      entry.units += row.error ? 0 : (row.units_used ?? 1)
      if (row.error) entry.errors++
      byDay.set(day, entry)
    }

    const daily = Array.from(byDay.values()).sort((a, b) =>
      a.day.localeCompare(b.day)
    )

    return NextResponse.json({ service_name: name, days, daily, raw: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
