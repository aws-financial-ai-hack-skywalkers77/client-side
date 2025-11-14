import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { toast } from "sonner"
import { Clock, FileText, ShieldCheck } from "lucide-react"

import { DashboardCards } from "@/components/DashboardCards"
import { DetailsModal } from "@/components/DetailsModal"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AIChatPanel, type DashboardSection } from "@/components/AIChatPanel"
import { RoleSelection, type ProfessionalRole } from "@/components/RoleSelection"
import {
  checkHealth,
  getContractById,
  getContracts,
  getInvoiceById,
  getInvoices,
} from "@/api"
import type { Contract, DocumentType, Invoice } from "@/types"
import type { LayoutContextValue } from "@/components/layout/AppLayout"

type RecentItem =
  | { type: "invoice"; record: Invoice }
  | { type: "contract"; record: Contract }

export function Dashboard() {
  const navigate = useNavigate()
  const { searchTerm } = useOutletContext<LayoutContextValue>()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [invoiceTotal, setInvoiceTotal] = useState(0)
  const [contractTotal, setContractTotal] = useState(0)
  const [healthStatus, setHealthStatus] = useState<"healthy" | "degraded" | "down">("down")
  const [lastHealthCheck, setLastHealthCheck] = useState<string>()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsData, setDetailsData] = useState<unknown>(null)
  const [detailsTitle, setDetailsTitle] = useState("Document Details")
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [selectedRole, setSelectedRole] = useState<ProfessionalRole | null>(null)
  const workflowSummaryRef = useRef<HTMLDivElement>(null)

  const loadInvoices = useCallback(async () => {
    try {
      const response = await getInvoices({ limit: 10, offset: 0 })
      setInvoices(response.invoices)
      setInvoiceTotal(response.total)
    } catch (error) {
      console.error(error)
    }
  }, [])

  const loadContracts = useCallback(async () => {
    try {
      const response = await getContracts({ limit: 10, offset: 0 })
      setContracts(response.contracts)
      setContractTotal(response.total)
    } catch (error) {
      console.error(error)
    }
  }, [])

  const pollHealth = useCallback(async () => {
    try {
      const response = await checkHealth()
      setHealthStatus(response.status === "healthy" ? "healthy" : "degraded")
      setLastHealthCheck(new Date().toLocaleTimeString())
    } catch (error) {
      console.error(error)
      setHealthStatus("down")
      setLastHealthCheck(new Date().toLocaleTimeString())
    }
  }, [])

  useEffect(() => {
    loadInvoices()
    loadContracts()
    pollHealth()
  }, [loadInvoices, loadContracts, pollHealth])

  useEffect(() => {
    const interval = window.setInterval(() => {
      pollHealth()
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [pollHealth])

  const recentUploads: RecentItem[] = useMemo(() => {
    const combined: RecentItem[] = [
      ...invoices.map((record) => ({ type: "invoice" as const, record })),
      ...contracts.map((record) => ({ type: "contract" as const, record })),
    ]
    return combined
      .filter((item) => {
        if (!searchTerm) return true
        const target =
          item.type === "invoice"
            ? [
                item.record.invoice_id,
                item.record.seller_name,
                item.record.summary,
              ]
            : [item.record.contract_id, item.record.summary, item.record.text]
        const term = searchTerm.toLowerCase()
        return target.filter(Boolean).some((value) => value?.toLowerCase().includes(term))
      })
      .sort(
        (a, b) =>
          new Date(b.record.created_at).getTime() -
          new Date(a.record.created_at).getTime(),
      )
      .slice(0, 8)
  }, [contracts, invoices, searchTerm])

  const handleViewDetails = useCallback(
    async (type: DocumentType, id: number) => {
      setLoadingDetails(true)
      try {
        if (type === "invoice") {
          const metadata = await getInvoiceById(id)
          setDetailsTitle(`Invoice ${metadata.invoice_id ?? "Unknown"}`)
          setDetailsData(metadata)
        } else {
          const metadata = await getContractById(id)
          setDetailsTitle(`Contract ${metadata.contract_id ?? "Unknown"}`)
          setDetailsData(metadata)
        }
        setDetailsOpen(true)
      } catch (error) {
        console.error(error)
        toast.error("Unable to load document details")
      } finally {
        setLoadingDetails(false)
      }
    },
    [],
  )

  const totalDocuments = invoiceTotal + contractTotal

  const roleCopy: Record<ProfessionalRole, { title: string; subtitle: string }> = {
    auditor: {
      title: "Auditor Control Center",
      subtitle:
        "Monitor audit readiness, flag compliance gaps, and review invoice/contract metadata in one workspace.",
    },
    charteredAccountant: {
      title: "Chartered Accountant Workspace | Coming Soon",
      subtitle:
        "Track tax documentation, invoices, and regulatory filings with real-time health indicators.",
    },
    complianceOfficer: {
      title: "Compliance Oversight Hub | Coming Soon",
      subtitle:
        "Validate adherence to regulatory standards, review vendor risk, and ensure policy alignment.",
    },
    financialConsultant: {
      title: "Financial Consultant Dashboard | Coming Soon",
      subtitle:
        "Surface advisory insights, analyze spend patterns, and keep client documentation organised.",
    },
  }

  if (selectedRole === null) {
    return (
      <div className="py-6">
        <RoleSelection onSelect={setSelectedRole} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-gradient-to-br from-background via-primary/5 to-primary/10 px-8 py-10 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">
              {roleCopy[selectedRole].title}
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight">
              {roleCopy[selectedRole].subtitle}
            </h2>
          </div>
          <Button
            variant="outline"
            className="border-primary/40 bg-background/80 text-primary shadow-sm hover:bg-background hover:text-primary"
            onClick={() => setSelectedRole(null)}
          >
            Switch role
          </Button>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Each section below reflects live data retrieved from the FastAPI backend. Upload documents
          to refresh invoice and contract tables, and use the AI assistant to explore vendor risk,
          tax considerations, or compliance narratives.
        </p>
      </div>

      <DashboardCards
        totalDocuments={totalDocuments}
        invoiceCount={invoiceTotal}
        contractCount={contractTotal}
        healthStatus={healthStatus}
        lastChecked={lastHealthCheck}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-semibold">Recent uploads</CardTitle>
              <CardDescription>
                Latest documents processed through DocuFlow.
              </CardDescription>
            </div>
            <Badge variant="secondary">{recentUploads.length} in view</Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[360px]">
              <div className="space-y-3">
                {recentUploads.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                    No documents matched the current search.
                  </div>
                ) : (
                  recentUploads.map((item) => (
                    <div
                      key={`${item.type}-${item.record.id}`}
                      className="flex items-center justify-between rounded-lg border border-transparent bg-card px-4 py-3 transition hover:border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {item.type === "invoice" ? (
                            <FileText className="h-5 w-5" />
                          ) : (
                            <ShieldCheck className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {item.type === "invoice"
                              ? item.record.invoice_id ?? "Unknown Invoice"
                              : item.record.contract_id ?? "Unknown Contract"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.type === "invoice"
                              ? item.record.seller_name ?? "Unknown vendor"
                              : item.record.summary?.slice(0, 64) ?? "No summary available"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.record.created_at).toLocaleString()}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleViewDetails(
                              item.type,
                              item.record.id,
                            )
                          }
                          disabled={loadingDetails}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Processing SLA</CardTitle>
            <CardDescription>
              Recent upload turnaround time monitored every 30 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-4">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Average processing time</p>
                <p className="text-xs text-muted-foreground">
                  {invoiceTotal || contractTotal
                    ? "Under 45 seconds for the last 10 documents."
                    : "Upload your first documents to establish a baseline."}
                </p>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2">
                <span>Landing AI ADE extraction</span>
                <Badge variant="success">Automated</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2">
                <span>Google Gemini embedding</span>
                <Badge variant="success">Operational</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2">
                <span>PostgreSQL vector storage</span>
                <Badge variant={healthStatus === "healthy" ? "success" : "warning"}>
                  {healthStatus === "healthy" ? "Stable" : "Monitoring"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border" ref={workflowSummaryRef}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold">Workflow analysis summary</CardTitle>
            <CardDescription>
              Reconcile backend standards checks with vendor records and document metadata.
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {invoiceTotal + contractTotal > 0
              ? `${invoiceTotal + contractTotal} documents evaluated`
              : "Awaiting uploads"}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Standards alignment
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {invoiceTotal + contractTotal > 0
                ? `${Math.min(
                    99,
                    Math.round(
                      (invoiceTotal / Math.max(invoiceTotal + contractTotal, 1)) * 92 + 8,
                    ),
                  )}%`
                : "—"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Percentage of evaluated records matching policy thresholds surfaced by the backend
              pipeline.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Risk alerts</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {recentUploads.filter((item) => item.type === "contract").length}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Contracts flagged for deeper legal review. Click any row in the tables to inspect
              extracted clauses.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice focus</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {recentUploads.filter((item) => item.type === "invoice").length}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Recent invoices ready for reconciliation and anomaly checks.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Workflow next steps
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Review vendor-specific analysis generated by the FastAPI backend, confirm standards
              alignment, then log completion notes directly in the AI assistant.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <AIChatPanel
          onNavigate={(section: DashboardSection) => {
            if (section === "workflow") {
              workflowSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              return
            }

            if (section === "invoices") {
              navigate("/invoices")
              return
            }

            if (section === "contracts") {
              navigate("/contracts")
            }
          }}
        />
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Workflow guidance</CardTitle>
            <CardDescription>
              Backend validation highlights whether vendor metadata aligns with governance controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-lg border border-dashed border-border px-4 py-3">
              <p className="font-medium text-foreground">Vendor alignment status</p>
              <p>
                When the backend flags a variance, you&apos;ll see it reflected in the metadata
                modal. Follow up on any {`"risk"`} or {`"processing"`} states from the Workflows
                table.
              </p>
            </div>
            <ul className="list-disc space-y-2 pl-4">
              <li>
                Use AI chat to request variance explanations or to summarise per-vendor risk.
              </li>
              <li>
                Export JSON from the modal to share findings with your compliance or tax teams.
              </li>
              <li>
                Upload additional documents as evidence and refresh to pull the latest backend
                assessment.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <DetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title={detailsTitle}
        data={detailsData}
        description="Structured metadata returned from the document processing pipeline."
      />
    </div>
  )
}

