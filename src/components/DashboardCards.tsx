import { ArrowUpRight, FileText, ShieldCheck } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type DashboardCardsProps = {
  totalDocuments: number
  invoiceCount: number
  contractCount: number
  healthStatus: "healthy" | "degraded" | "down"
  lastChecked?: string
}

const healthConfig: Record<
  DashboardCardsProps["healthStatus"],
  { label: string; badge: "success" | "warning" | "destructive"; description: string }
> = {
  healthy: {
    label: "Operational",
    badge: "success",
    description: "All API services responding normally",
  },
  degraded: {
    label: "Degraded",
    badge: "warning",
    description: "Increased latency detected",
  },
  down: {
    label: "Offline",
    badge: "destructive",
    description: "API is not responding",
  },
}

export function DashboardCards({
  totalDocuments,
  invoiceCount,
  contractCount,
  healthStatus,
  lastChecked,
}: DashboardCardsProps) {
  const health = healthConfig[healthStatus]

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Documents Processed
          </CardTitle>
          <ArrowUpRight className="h-5 w-5 text-[#FF9900] dark:text-[#FFB84D]" />
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="text-4xl font-semibold">{totalDocuments.toLocaleString()}</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Includes invoices and contracts processed through FastAPI.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Invoices
          </CardTitle>
          <FileText className="h-5 w-5 text-[#FF9900] dark:text-[#FFB84D]" />
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="text-3xl font-semibold">{invoiceCount.toLocaleString()}</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Recent activity synced from ADE invoice pipeline.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Contracts
          </CardTitle>
          <ShieldCheck className="h-5 w-5 text-[#FF9900] dark:text-[#FFB84D]" />
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="text-3xl font-semibold">{contractCount.toLocaleString()}</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Vectorized contract clauses ready for review.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="px-6 pt-6">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            API Health
          </CardTitle>
          <CardDescription>Realtime status from http://localhost:8001</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-6 pb-6">
          <Badge variant={health.badge} className={cn("w-fit px-3 py-1 text-xs")}>
            {health.label}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {health.description}
          </p>
          {lastChecked ? (
            <p className="text-xs text-muted-foreground">
              Last checked: {lastChecked}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

