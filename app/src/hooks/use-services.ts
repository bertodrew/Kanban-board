"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { ServiceWithUsage, UpdateServiceLimit } from "@/types"

export function useServicesQuery() {
  return useQuery<ServiceWithUsage[]>({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const res = await fetch("/api/admin/services")
      if (!res.ok) throw new Error("Failed to fetch services")
      return res.json()
    },
    refetchInterval: 30_000, // Auto-refresh every 30s
  })
}

export function useUpdateServiceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      serviceName,
      updates,
    }: {
      serviceName: string
      updates: UpdateServiceLimit
    }) => {
      const res = await fetch("/api/admin/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_name: serviceName, ...updates }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to update service")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] })
    },
  })
}

export function useServiceUsageQuery(name: string, days = 30) {
  return useQuery({
    queryKey: ["admin-service-usage", name, days],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/services/${name}/usage?days=${days}`
      )
      if (!res.ok) throw new Error("Failed to fetch usage")
      return res.json()
    },
    enabled: !!name,
  })
}
