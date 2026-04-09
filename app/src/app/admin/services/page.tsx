"use client"

import { useServicesQuery } from "@/hooks/use-services"
import { SummaryCards } from "@/components/admin/summary-cards"
import { AlertBanner } from "@/components/admin/alert-banner"
import { ServiceCard } from "@/components/admin/service-card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, Loader2, LayoutDashboard, AlertTriangle } from "lucide-react"
import { Toaster } from "sonner"
import Link from "next/link"

export default function AdminServicesPage() {
  const { data: services, isLoading, isError, error, refetch, isFetching } =
    useServicesQuery()

  return (
    <div className="flex flex-col h-screen">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <header className="border-b px-4 py-2.5 flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Service Monitor</h1>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6 space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-4 text-red-400" />
            <p className="text-lg font-medium">Failed to load services</p>
            <p className="text-sm mb-4">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {services && (
          <>
            <SummaryCards services={services} />
            <AlertBanner services={services} />

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {services.map((svc) => (
                <ServiceCard key={svc.service_name} service={svc} />
              ))}
            </div>

            {services.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <p className="text-lg font-medium">No services configured</p>
                <p className="text-sm">
                  Run the migration to seed the service_limits table.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
