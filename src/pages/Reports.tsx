import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, ArrowLeft, Clock, Download, FileText, Link2, TrendingUp, Eye, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ContractClauseDetailDialog } from "@/components/ContractClauseDetailDialog"
import { PieChart } from "@/components/PieChart"
import { useWorkflowReport } from "@/context/WorkflowReportContext"
import {
  complianceReportPdfUrl,
  getComplianceReportLatest,
  openInvoicePdfInNewTab,
} from "@/api"
import { cn } from "@/lib/utils"
import {
  formatRiskAssessmentScoreRaw,
  resolveRiskDisplay,
  riskBadgeClasses,
} from "@/lib/riskDisplay"
import { toast } from "sonner"
import type {
  ClauseReference,
  ComplianceEscalation,
  ComplianceReportLatest,
  InvoiceWorkflowContractClause,
  InvoiceWorkflowReport,
  InvoiceWorkflowViolation,
  LineEvaluationRow,
} from "@/types"

type FlattenedViolation = InvoiceWorkflowViolation & {
  invoice_id: string
  invoice_db_id?: number
  processed_at?: string
  risk_percentage?: number | null
}

function reviewStatusBadgeClass(status: string): string {
  const s = status.toLowerCase()
  if (s.includes("cleared")) {
    return "border-green-500/60 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300"
  }
  if (s.includes("violation")) {
    return "border-red-500/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
  }
  if (s.includes("needs_review") || s.includes("needs review")) {
    return "border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
  }
  if (s.includes("failed") || s.includes("insufficient") || s.includes("no_contract")) {
    return "border-orange-500/60 bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200"
  }
  return "border-border bg-muted/40 text-foreground"
}

function escalationSeverityBadgeProps(severity: string | undefined): "destructive" | "secondary" | "outline" {
  const u = (severity ?? "").toLowerCase()
  if (u === "high" || u === "error" || u === "critical" || u === "severe") return "destructive"
  if (u === "medium" || u === "warn" || u === "warning") return "secondary"
  return "outline"
}

function lineEvaluationOutcome(row: LineEvaluationRow): string {
  const o = row.outcome ?? row.status ?? row.result
  return typeof o === "string" ? o : "—"
}

/** line_id → invoice_line_item_db_id → Line {line_index + 1} */
function lineEvaluationLineLabel(row: LineEvaluationRow): string {
  if (row.line_id != null && String(row.line_id).trim() !== "") {
    return String(row.line_id)
  }
  const dbId = row.invoice_line_item_db_id
  if (typeof dbId === "number") {
    return `Line item id: ${dbId}`
  }
  if (typeof row.line_index === "number") {
    return `Line ${row.line_index + 1}`
  }
  return "—"
}

function lineEvaluationDescription(row: LineEvaluationRow): string {
  const d =
    (typeof row.description === "string" && row.description) ||
    (typeof (row as { summary?: string }).summary === "string" && (row as { summary?: string }).summary) ||
    (typeof (row as { line_description?: string }).line_description === "string" &&
      (row as { line_description?: string }).line_description)
  return typeof d === "string" && d.length > 0 ? d : "—"
}

function EscalationList({ items }: { items: ComplianceEscalation[] }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-lg border border-border/60 bg-muted/15 p-3 space-y-2">
      <p className="text-xs font-semibold text-foreground">Escalations</p>
      <ul className="space-y-2">
        {items.map((e, i) => (
          <li
            key={`${e.code ?? ""}-${i}`}
            className="flex flex-wrap items-start gap-2 rounded-md border border-border/50 bg-card/80 px-2 py-1.5 text-xs"
          >
            {e.severity ? (
              <Badge variant={escalationSeverityBadgeProps(e.severity)} className="text-[10px] shrink-0">
                {e.severity}
              </Badge>
            ) : null}
            {e.code ? (
              <span className="font-mono text-[10px] text-muted-foreground shrink-0">{e.code}</span>
            ) : null}
            <span className="text-muted-foreground leading-snug">{e.message ?? JSON.stringify(e)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

type FlattenedClause = InvoiceWorkflowContractClause & {
  invoice_id: string
}

function formatViolationClauseReference(ref: ClauseReference): string {
  const clausePart =
    ref.clause_id != null && String(ref.clause_id).trim() !== ""
      ? ` · clause ${ref.clause_id}`
      : ""
  const base =
    `${ref.contract_id || ""}${clausePart} ${ref.vendor_name ? `(${ref.vendor_name})` : ""}`.trim()
  return base || "N/A"
}

export function Reports() {
  const navigate = useNavigate()
  const { invoiceBatch } = useWorkflowReport()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("all")
  const [complianceByDbId, setComplianceByDbId] = useState<
    Record<number, ComplianceReportLatest | { error: true }>
  >({})
  const [complianceLoading, setComplianceLoading] = useState(false)
  const [clauseDetailOpen, setClauseDetailOpen] = useState(false)
  const [clauseDetailSelection, setClauseDetailSelection] = useState<{
    contractDbId: number
    clauseId: string
  } | null>(null)

  const hasData = invoiceBatch && invoiceBatch.invoices.length > 0

  const openClauseDetailFromTile = useCallback((clause: FlattenedClause) => {
    const dbId = clause.contract_db_id
    const raw = clause.clause_id
    const cId = raw != null && String(raw).trim() !== "" ? String(raw) : null
    if (typeof dbId !== "number" || !cId) {
      toast.error(
        "This match needs a contract database id and clause id from the workflow to load clause text.",
      )
      return
    }
    setClauseDetailSelection({ contractDbId: dbId, clauseId: cId })
    setClauseDetailOpen(true)
  }, [])

  const uniqueReportRows = useMemo(() => {
    if (!invoiceBatch?.invoices.length) return []
    const seen = new Set<string>()
    const rows: InvoiceWorkflowReport[] = []
    for (const inv of invoiceBatch.invoices) {
      const key = inv.invoice_db_id != null ? `db:${inv.invoice_db_id}` : `id:${inv.invoice_id}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push(inv)
    }
    return rows
  }, [invoiceBatch])

  useEffect(() => {
    if (!invoiceBatch?.invoices.length) {
      setComplianceByDbId({})
      return
    }
    const ids = [
      ...new Set(
        invoiceBatch.invoices
          .map((i) => i.invoice_db_id)
          .filter((id): id is number => typeof id === "number"),
      ),
    ]
    if (ids.length === 0) {
      setComplianceByDbId({})
      return
    }
    let cancelled = false
    setComplianceLoading(true)
    void Promise.allSettled(ids.map((id) => getComplianceReportLatest(id))).then((results) => {
      if (cancelled) return
      const next: Record<number, ComplianceReportLatest | { error: true }> = {}
      results.forEach((res, idx) => {
        const id = ids[idx]
        if (res.status === "fulfilled") {
          next[id] = res.value
        } else {
          next[id] = { error: true }
        }
      })
      setComplianceByDbId(next)
      setComplianceLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [invoiceBatch])

  const {
    totalViolations,
    processedInvoices,
    totalLineItems,
    totalRulesEvaluated,
    averageNextRunHours,
    violationBreakdown,
    flattenedClauses,
  } = useMemo(() => {
    if (!invoiceBatch || invoiceBatch.invoices.length === 0) {
      return {
        processedInvoices: 0,
        totalViolations: 0,
        totalLineItems: 0,
        totalRulesEvaluated: 0,
        averageNextRunHours: null as number | null,
        violationBreakdown: new Map<string, number>(),
        flattenedClauses: [] as FlattenedClause[],
      }
    }

    const violationMap = new Map<string, number>()
    let violations = 0
    let lines = 0
    let rules = 0
    let runHoursAccumulator = 0
    let runHoursSamples = 0
    const clauseRows: FlattenedClause[] = []

    invoiceBatch.invoices.forEach((invoice: InvoiceWorkflowReport) => {
      violations += invoice.violations?.length ?? 0
      invoice.violations?.forEach((violation) => {
        const key = violation.violation_type ?? "Unknown violation"
        violationMap.set(key, (violationMap.get(key) ?? 0) + 1)
      })

      if (invoice.evaluation_summary) {
        lines += invoice.evaluation_summary.line_items_evaluated ?? 0
        rules += invoice.evaluation_summary.rules_evaluated ?? 0
      }

      if (typeof invoice.next_run_scheduled_in_hours === "number") {
        runHoursAccumulator += invoice.next_run_scheduled_in_hours
        runHoursSamples += 1
      }

      invoice.contract_clauses?.forEach((clause) => {
        clauseRows.push({
          ...clause,
          invoice_id: invoice.invoice_id,
        })
      })
    })

    return {
      processedInvoices: invoiceBatch.invoices.length,
      totalViolations: violations,
      totalLineItems: lines,
      totalRulesEvaluated: rules,
      averageNextRunHours:
        runHoursSamples > 0 ? Math.round((runHoursAccumulator / runHoursSamples) * 10) / 10 : null,
      violationBreakdown: violationMap,
      flattenedClauses: clauseRows,
    }
  }, [invoiceBatch])

  // Group violations by invoice_id (allowing duplicates)
  const groupedViolationsByInvoice = useMemo(() => {
    if (!invoiceBatch) return new Map<string, { invoice: InvoiceWorkflowReport; violations: FlattenedViolation[] }[]>()
    
    const grouped = new Map<string, { invoice: InvoiceWorkflowReport; violations: FlattenedViolation[] }[]>()
    
    invoiceBatch.invoices.forEach((invoice) => {
      const invoiceId = invoice.invoice_id
      if (!invoiceId) return
      
      if (!grouped.has(invoiceId)) {
        grouped.set(invoiceId, [])
      }
      
      const group = grouped.get(invoiceId)!
      const violations: FlattenedViolation[] = []
      
      invoice.violations?.forEach((violation) => {
        violations.push({
          ...violation,
          invoice_id: invoice.invoice_id,
          invoice_db_id: invoice.invoice_db_id,
          processed_at: invoice.processed_at,
          risk_percentage: invoice.risk_percentage,
        })
      })
      
      group.push({
        invoice,
        violations,
      })
    })
    
    return grouped
  }, [invoiceBatch])

  // Filter by selected invoice
  const displayedInvoices = useMemo(() => {
    if (selectedInvoiceId === "all") {
      // Flatten all invoice groups into a single array
      const allInvoices: { invoice: InvoiceWorkflowReport; violations: FlattenedViolation[] }[] = []
      groupedViolationsByInvoice.forEach((invoiceGroups) => {
        allInvoices.push(...invoiceGroups)
      })
      return allInvoices
    }
    return groupedViolationsByInvoice.get(selectedInvoiceId) || []
  }, [groupedViolationsByInvoice, selectedInvoiceId])

  // Get selected invoice report for risk assessment display (use first one if duplicates)
  const selectedInvoiceReport = useMemo(() => {
    if (selectedInvoiceId === "all" || !invoiceBatch) return null
    return invoiceBatch.invoices.find((inv) => inv.invoice_id === selectedInvoiceId) || null
  }, [invoiceBatch, selectedInvoiceId])

  // Prepare pie chart data for risk distribution
  const pieChartData = useMemo(() => {
    if (!invoiceBatch) return []
    
    const riskCounts = {
      good: 0,
      low: 0,
      medium: 0,
      high: 0,
      unknown: 0,
    }

    invoiceBatch.invoices.forEach((inv) => {
      const riskInfo = resolveRiskDisplay({
        risk_tier: inv.risk_tier,
        risk_percentage: inv.risk_percentage,
      })
      riskCounts[riskInfo.level]++
    })

    return [
      { label: "Good", value: riskCounts.good, color: "#10b981" },
      { label: "Low", value: riskCounts.low, color: "#3b82f6" },
      { label: "Medium", value: riskCounts.medium, color: "#f59e0b" },
      { label: "High", value: riskCounts.high, color: "#ef4444" },
      { label: "Unknown", value: riskCounts.unknown, color: "#64748b" },
    ].filter((item) => item.value > 0)
  }, [invoiceBatch])

  /** Per-row: prefer that row’s compliance report pdf_url / llm_metadata.s3_url, then pdf_url endpoints. */
  const openPdfForInvoiceRow = useCallback(
    async (invoiceDbId?: number, invoiceBusinessId?: string | null) => {
      if (invoiceDbId !== undefined) {
        const latest = complianceByDbId[invoiceDbId]
        if (latest && !("error" in latest)) {
          const fromReport = complianceReportPdfUrl(latest)
          if (fromReport) {
            window.open(fromReport, "_blank", "noopener,noreferrer")
            return
          }
        }
      }
      try {
        await openInvoicePdfInNewTab({
          invoiceDbId,
          invoiceBusinessId: invoiceBusinessId ?? undefined,
        })
      } catch {
        toast.error("Could not open PDF — use database id or business invoice id; check API host and CORS.")
      }
    },
    [complianceByDbId],
  )

  const handleExportPdf = () => {
    window.print()
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-border bg-card/60 px-12 py-16 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF9900]/10 dark:bg-[#FF9900]/20 text-[#FF9900] dark:text-[#FFB84D]">
          <FileText className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Run a workflow to generate reports</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Select one or more invoices on the Invoices screen and run the workflow. Your analytics,
            violations, and contract clause matches will be summarised here automatically.
          </p>
        </div>
        <Button type="button" onClick={() => navigate("/invoices")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Go to invoices
        </Button>
      </div>
    )
  }

  const generatedAt = new Date(invoiceBatch!.generated_at).toLocaleString()
  const topViolations = Array.from(violationBreakdown.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4)
  const topClauses = flattenedClauses
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border dark:border-[#37475A]/50 bg-gradient-to-br from-background via-primary/5 to-primary/10 dark:from-[#1A232E] dark:via-[#FF9900]/5 dark:to-[#FF9900]/10 px-10 py-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#232F3E] dark:text-[#FFB84D]">Invoice workflow report</p>
          <h1 className="text-3xl font-semibold text-foreground">
            Compliance analytics and clause intelligence
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Review automatically generated metrics, rule violations, and contract clause mappings from the
            latest workflow execution. Export the summary to PDF for audit or stakeholder sharing.
          </p>
          <p className="text-xs text-muted-foreground">Generated at {generatedAt}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/invoices")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Button>
          <Button onClick={handleExportPdf} className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold">Invoices processed</CardTitle>
            <CardDescription>Batch size for the latest workflow run.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <p className="text-3xl font-semibold text-foreground">{processedInvoices}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold">Violations detected</CardTitle>
            <CardDescription>Total applied rules that flagged exceptions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 px-6 pb-6">
            <p className="text-3xl font-semibold text-destructive">{totalViolations}</p>
            <div className="space-y-1">
              {topViolations.map(([label, count]) => (
                <div key={label} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{label}</span>
                  <span className="font-semibold text-foreground">{count}</span>
                </div>
              ))}
              {topViolations.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No violations were reported in this batch.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold">Line items evaluated</CardTitle>
            <CardDescription>Coverage across all purchase lines.</CardDescription>
          </CardHeader>
        <CardContent className="space-y-1 px-6 pb-6">
            <p className="text-3xl font-semibold text-foreground">{totalLineItems}</p>
          <p className="text-xs text-muted-foreground">
            {totalRulesEvaluated} rules executed across the batch.
          </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold">Average next run</CardTitle>
            <CardDescription>Scheduling guidance from the backend.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 px-6 pb-6">
            <Clock className="h-5 w-5 text-[#FF9900] dark:text-[#FFB84D]" />
            <p className="text-2xl font-semibold text-foreground">
              {averageNextRunHours !== null ? `${averageNextRunHours} hrs` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle className="text-lg font-semibold">Compliance reports</CardTitle>
          <CardDescription>
            Saved compliance snapshot per invoice. View PDF opens the document from storage; when a highlighted
            copy exists in S3, that version is opened first.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          {complianceLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading compliance reports…
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Invoice</th>
                  <th className="px-3 py-2 font-medium">DB ID</th>
                  <th className="px-3 py-2 font-medium text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {uniqueReportRows.map((inv) => {
                  const dbId = inv.invoice_db_id
                  return (
                    <tr key={inv.invoice_db_id ?? inv.invoice_id} className="border-b border-border/30 last:border-0">
                      <td className="px-3 py-2 text-foreground">{inv.invoice_id}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">
                        {dbId !== undefined ? dbId : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {dbId === undefined && !inv.invoice_id ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => void openPdfForInvoiceRow(dbId, inv.invoice_id)}
                          >
                            <Eye className="h-3 w-3" />
                            View PDF
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {uniqueReportRows.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-4">No invoice rows in this batch.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-5 pb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-lg font-semibold">Violation Analysis</CardTitle>
              <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                <SelectTrigger className="w-[280px] h-8 text-xs">
                  <SelectValue placeholder="Select invoice to view details" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Invoices ({processedInvoices})</SelectItem>
                  {Array.from(groupedViolationsByInvoice.entries()).map(([invoiceId, invoiceGroups]) => {
                    // Use first invoice from the group for display info
                    const firstInvoice = invoiceGroups[0]?.invoice
                    if (!firstInvoice) return null
                    const riskInfo = resolveRiskDisplay({
                      risk_tier: firstInvoice.risk_tier,
                      risk_percentage: firstInvoice.risk_percentage,
                    })
                    const count = invoiceGroups.length
                    return (
                      <SelectItem key={invoiceId} value={invoiceId}>
                        {invoiceId} {count > 1 ? `(${count} runs)` : ""} - {riskInfo.label} Risk
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <CardDescription>
              {selectedInvoiceId === "all"
                ? "Comprehensive violation analysis across all processed invoices. Select an invoice from the dropdown to view detailed violations."
                : selectedInvoiceReport
                  ? `Rule breaches and compliance violations for ${selectedInvoiceReport.invoice_id}`
                  : "Rule breaches grouped by invoice and contract references."}
            </CardDescription>
          </div>
          <Badge variant="destructive" className="gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            {totalViolations} flagged
          </Badge>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          <ScrollArea className="h-[500px] w-full">
            <div className="min-w-full space-y-4 pr-4">
              {selectedInvoiceId === "all" ? (
                // Show pie chart and intro when "all" is selected
                <div className="space-y-6 py-4">
                  <div className="rounded-lg border border-border bg-gradient-to-br from-background to-muted/20 p-6">
                    <h3 className="text-base font-semibold text-foreground mb-3">Risk Distribution Overview</h3>
                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                      This section displays comprehensive violation analysis for all invoices processed in the current workflow batch. 
                      The chart below visualizes the risk distribution across all invoices, categorized by risk level (Good, Low, Medium, High). 
                      Use the dropdown above to select a specific invoice and view its detailed violations, compliance issues, and contract clause mappings.
                    </p>
                    {pieChartData.length > 0 ? (
                      <div className="flex justify-center">
                        <PieChart data={pieChartData} size={240} innerRadius={80} />
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No risk data available
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border border-dashed border-border px-6 py-8 text-center bg-muted/20">
                    <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground mb-2">Select an invoice to view violations</p>
                    <p className="text-xs text-muted-foreground">
                      Choose an invoice from the dropdown to view detailed violation analysis, risk assessments, and compliance findings.
                    </p>
                  </div>
                </div>
              ) : displayedInvoices.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                  No violations found for the selected invoice.
                </div>
              ) : (
                // Show grouped violations by invoice
                displayedInvoices.map(({ invoice, violations }, index) => {
                  const riskInfo = resolveRiskDisplay({
                    risk_tier: invoice.risk_tier,
                    risk_percentage: invoice.risk_percentage,
                  })
                  const riskPercentage = invoice.risk_percentage ?? 0
                  const scoreRaw = formatRiskAssessmentScoreRaw(invoice.risk_assessment_score)
                  const showRiskBar =
                    typeof invoice.risk_percentage === "number" ||
                    (typeof invoice.risk_assessment_score === "number" && invoice.risk_assessment_score >= 0)
                  const barValue =
                    typeof invoice.risk_percentage === "number"
                      ? invoice.risk_percentage
                      : typeof invoice.risk_assessment_score === "number"
                        ? Math.min(100, Math.max(0, invoice.risk_assessment_score * 100))
                        : 0
                  return (
                    <div
                      key={`${invoice.invoice_id}-${index}-${invoice.invoice_db_id || ""}`}
                      className="rounded-lg border border-border dark:border-[#37475A]/50 bg-card/70 dark:bg-[#1A232E]/70 p-5 shadow-sm transition hover:border-[#FF9900]/40 dark:hover:border-[#FFB84D]/40 hover:shadow mb-4"
                    >
                      {/* Invoice Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-4 border-b border-border/50">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-lg font-semibold text-foreground">
                              Invoice {invoice.invoice_id}
                            </p>
                            {invoice.invoice_db_id && (
                              <Badge variant="outline" className="text-xs">ID: {invoice.invoice_db_id}</Badge>
                            )}
                          </div>
                        <p className="text-xs text-muted-foreground">
                            Processed {invoice.processed_at ? new Date(invoice.processed_at).toLocaleString() : generatedAt}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {violations.length} violation{violations.length !== 1 ? "s" : ""} detected
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 shrink-0"
                            onClick={() => void openPdfForInvoiceRow(invoice.invoice_db_id, invoice.invoice_id)}
                          >
                            <Eye className="h-3 w-3" />
                            View PDF
                          </Button>
                        </div>
                      </div>

                      {/* Violations */}
                      {violations.length > 0 && (
                        <div className="space-y-3 mb-4">
                          <h4 className="text-sm font-semibold text-foreground mb-2">Violations ({violations.length}):</h4>
                          {violations.map((violation, index) => (
                            <div
                              key={`${violation.line_id ?? index}`}
                              className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3"
                            >
                              {/* Violation Header */}
                              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/30">
                                <Badge variant="destructive" className="text-xs font-semibold">
                                  {violation.violation_type}
                                </Badge>
                                {(violation.line_id ||
                                  typeof (violation as { line_index?: number }).line_index === "number") && (
                                  <span className="text-xs text-muted-foreground">
                                    Line
                                    {violation.line_id ? `: ${violation.line_id}` : ""}
                                    {typeof (violation as { line_index?: number }).line_index === "number"
                                      ? ` · index ${(violation as { line_index?: number }).line_index}`
                                      : ""}
                                  </span>
                                )}
                              </div>

                              {/* Details Grid */}
                              <div className="grid gap-2 sm:grid-cols-2">
                                {(violation.clause_reference || violation.contract_clause_reference) && (
                                  <div className="rounded-md bg-muted/40 p-2 border border-border/30">
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Clause</p>
                                    <p className="text-xs font-semibold text-foreground break-words">
                                      {typeof violation.clause_reference === "object" && violation.clause_reference !== null
                                        ? formatViolationClauseReference(violation.clause_reference)
                                        : typeof violation.clause_reference === "string"
                                          ? violation.clause_reference
                                          : violation.contract_clause_reference || "N/A"}
                                    </p>
                                  </div>
                                )}
                                {violation.expected_price !== undefined && violation.expected_price !== null && violation.actual_price !== undefined && violation.actual_price !== null && (
                                  <>
                                    <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 border border-green-200 dark:border-green-800">
                                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Expected</p>
                                      <p className="text-xs font-bold text-green-700 dark:text-green-400">
                                        ${violation.expected_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                    </div>
                                    <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-2 border border-red-200 dark:border-red-800">
                                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Actual</p>
                                      <p className="text-xs font-bold text-red-700 dark:text-red-400">
                                        ${violation.actual_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                    </div>
                                  </>
                                )}
                                {violation.difference !== undefined && violation.difference !== null && (
                                  <div className={`rounded-md p-2 border ${
                                    violation.difference >= 0 
                                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" 
                                      : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                  } sm:col-span-2`}>
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Difference</p>
                                    <p className={`text-sm font-bold ${
                                      violation.difference >= 0 
                                        ? "text-red-600 dark:text-red-400" 
                                        : "text-green-600 dark:text-green-400"
                                    }`}>
                                      {violation.difference >= 0 ? "+" : ""}${violation.difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                )}
                    </div>

                              {/* Reasoning Section */}
                              {violation.reasoning && (
                                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-2.5">
                                  <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                                    <FileText className="h-3 w-3" />
                                    Explanation
                                  </p>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {violation.reasoning.explanation || JSON.stringify(violation.reasoning, null, 2)}
                                  </p>
                    </div>
                              )}

                              {Array.isArray(violation.recommended_actions) &&
                              violation.recommended_actions.length > 0 ? (
                                <div className="rounded-lg border border-border/50 bg-muted/25 p-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                                    Recommended actions
                                  </p>
                                  <ul className="list-disc pl-4 space-y-1 text-xs text-foreground">
                                    {violation.recommended_actions.map((action, ai) => (
                                      <li key={ai}>{action}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              {/* Applied Rule Section */}
                              {violation.applied_rule && (
                                <details className="mt-1">
                                  <summary className="cursor-pointer text-xs font-semibold text-foreground hover:text-[#FF9900] dark:hover:text-[#FFB84D] transition-colors">
                                    Applied Rule Details
                                  </summary>
                                  <div className="mt-1.5 rounded-lg bg-muted/40 p-2 border border-border/30">
                                    <pre className="text-[10px] text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words">
{JSON.stringify(violation.applied_rule, null, 2)}
                      </pre>
                                  </div>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {(invoice.review_status ||
                        (invoice.escalations && invoice.escalations.length > 0)) && (
                        <div className="mb-4 space-y-3">
                          {invoice.review_status ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">Review status</span>
                              <Badge
                                variant="outline"
                                className={`text-xs font-semibold ${reviewStatusBadgeClass(invoice.review_status)}`}
                              >
                                {invoice.review_status}
                              </Badge>
                            </div>
                          ) : null}
                          {invoice.escalations && invoice.escalations.length > 0 ? (
                            <EscalationList items={invoice.escalations} />
                          ) : null}
                        </div>
                      )}

                      {invoice.audit_trace && Object.keys(invoice.audit_trace).length > 0 ? (
                        <details className="mb-4 rounded-lg border border-border/60 bg-muted/10">
                          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-foreground">
                            Audit trace (JSON)
                          </summary>
                          <pre className="max-h-64 overflow-auto border-t border-border/40 px-3 py-2 text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
                            {JSON.stringify(invoice.audit_trace, null, 2)}
                          </pre>
                        </details>
                      ) : null}

                      {showRiskBar ? (
                        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                              <TrendingUp className="h-3.5 w-3.5" />
                              Risk Assessment
                              {scoreRaw ? (
                                <span className="text-[10px] font-normal text-muted-foreground">
                                  (score {scoreRaw})
                                </span>
                              ) : null}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${riskBadgeClasses(riskInfo.level)}`}
                            >
                              {riskInfo.label}
                              {typeof invoice.risk_percentage === "number"
                                ? ` ${riskPercentage.toFixed(2)}%`
                                : ""}
                            </span>
                          </div>
                          <Progress
                            value={barValue}
                            className={`h-2.5 ${
                              riskInfo.level === "good" || riskInfo.level === "low"
                                ? "[&>div]:bg-green-500"
                                : riskInfo.level === "medium"
                                  ? "[&>div]:bg-yellow-500"
                                  : riskInfo.level === "unknown"
                                    ? "[&>div]:bg-slate-500"
                                    : "[&>div]:bg-red-500"
                            }`}
                          />
                        </div>
                      ) : null}

                      {invoice.line_evaluations && invoice.line_evaluations.length > 0 ? (
                        <div className="mb-4 overflow-x-auto rounded-lg border border-border/50">
                          <p className="text-xs font-semibold text-foreground px-3 py-2 bg-muted/30 border-b border-border/50">
                            Line evaluations
                          </p>
                          <table className="w-full text-left text-[11px]">
                            <thead>
                              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground">
                                <th className="px-3 py-1.5 font-medium">Line</th>
                                <th className="px-3 py-1.5 font-medium">Description</th>
                                <th className="px-3 py-1.5 font-medium">Outcome</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoice.line_evaluations.map((row, ri) => (
                                <tr
                                  key={`${lineEvaluationLineLabel(row)}-${ri}`}
                                  className="border-b border-border/30 last:border-0"
                                >
                                  <td className="px-3 py-1.5 font-mono text-foreground align-top">
                                    {lineEvaluationLineLabel(row)}
                                  </td>
                                  <td className="px-3 py-1.5 text-foreground align-top max-w-[min(280px,40vw)]">
                                    {lineEvaluationDescription(row)}
                                  </td>
                                  <td className="px-3 py-1.5 text-muted-foreground align-top">
                                    {lineEvaluationOutcome(row)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}

                      {invoice.pricing_rules?.rejected_rules &&
                      Array.isArray(invoice.pricing_rules.rejected_rules) &&
                      invoice.pricing_rules.rejected_rules.length > 0 ? (
                        <details className="mb-4 rounded-lg border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20">
                          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-foreground">
                            Rejected pricing rules ({invoice.pricing_rules.rejected_rules.length})
                          </summary>
                          <pre className="max-h-48 overflow-auto border-t border-border/40 px-3 py-2 text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
                            {JSON.stringify(invoice.pricing_rules.rejected_rules, null, 2)}
                          </pre>
                        </details>
                      ) : null}

                  </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-5 pb-3">
          <div>
            <CardTitle className="text-lg font-semibold">Contract clause alignment</CardTitle>
            <CardDescription>
              Top clause matches per invoice with similarity scores. Click a tile to load full clause text when
              contract and clause ids are present.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Link2 className="h-3.5 w-3.5" />
            {flattenedClauses.length} links
          </Badge>
        </CardHeader>
        <CardContent className="px-6 pb-5 overflow-hidden">
          <ScrollArea className="h-[300px] w-full">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pr-4 auto-rows-fr min-w-0">
              {topClauses.length === 0 ? (
                <div className="col-span-full rounded-lg border border-dashed border-border px-4 py-12 text-center bg-muted/20">
                  <Link2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm font-medium text-foreground mb-1">No clause matches found</p>
                  <p className="text-xs text-muted-foreground">
                  Clause recommendations will appear once the workflow matches invoices to contracts.
                  </p>
                </div>
              ) : (
                topClauses.map((clause, index) => {
                  const similarityPercentage = clause.similarity !== undefined ? Math.round((clause.similarity ?? 0) * 100) : 0
                  const similarityLevel = similarityPercentage >= 80 ? "high" : similarityPercentage >= 60 ? "medium" : "low"
                  const clauseIdLabel =
                    clause.clause_id != null && String(clause.clause_id).trim() !== ""
                      ? String(clause.clause_id)
                      : null
                  const canOpenClauseDetail =
                    typeof clause.contract_db_id === "number" && clauseIdLabel != null

                  return (
                  <button
                    type="button"
                    key={`${clause.invoice_id}-${clause.contract_id}-${clauseIdLabel ?? ""}-${index}`}
                    onClick={() => openClauseDetailFromTile(clause)}
                    disabled={!canOpenClauseDetail}
                    className={cn(
                      "rounded-lg border border-border/50 bg-gradient-to-br from-card/90 to-muted/20 p-4 shadow-sm min-w-0 w-full text-left",
                      canOpenClauseDetail
                        ? "cursor-pointer transition-all hover:border-[#FF9900]/40 dark:hover:border-[#FFB84D]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        : "cursor-not-allowed opacity-70",
                    )}
                  >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <Badge variant="outline" className="text-xs font-semibold bg-muted/50">
                        Invoice {clause.invoice_id}
                      </Badge>
                        <div className="flex items-center gap-1.5">
                          <Link2 className="h-3.5 w-3.5 text-[#FF9900] dark:text-[#FFB84D]" />
                          <span className={`text-xs font-bold ${
                            similarityLevel === "high" 
                              ? "text-green-600 dark:text-green-400"
                              : similarityLevel === "medium"
                                ? "text-[#FF9900] dark:text-[#FFB84D]"
                                : "text-orange-500 dark:text-orange-400"
                          }`}>
                            {similarityPercentage}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Contract & clause IDs */}
                      <div className="mb-3 space-y-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Contract ID</p>
                          <p className="text-sm font-bold text-foreground break-words">{clause.contract_id}</p>
                        </div>
                        {clauseIdLabel ? (
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Clause ID</p>
                            <p className="text-sm font-bold text-foreground break-words font-mono">{clauseIdLabel}</p>
                          </div>
                        ) : null}
                      </div>
                      
                      {/* Similarity Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Similarity Score</span>
                          <span className="font-semibold">{similarityPercentage}%</span>
                        </div>
                        <Progress 
                          value={similarityPercentage} 
                          className={`h-2 ${
                            similarityLevel === "high"
                              ? "[&>div]:bg-green-500"
                              : similarityLevel === "medium"
                                ? "[&>div]:bg-[#FF9900]"
                                : "[&>div]:bg-orange-500"
                          }`}
                        />
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>
                      
                      {/* Additional info if available */}
                      {clause.vendor_name ? (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Vendor</p>
                          <p className="text-xs font-medium text-foreground">{clause.vendor_name}</p>
                        </div>
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <ContractClauseDetailDialog
        open={clauseDetailOpen}
        onOpenChange={(open) => {
          setClauseDetailOpen(open)
          if (!open) setClauseDetailSelection(null)
        }}
        contractDbId={clauseDetailSelection?.contractDbId ?? null}
        clauseId={clauseDetailSelection?.clauseId ?? null}
      />
    </div>
  )
}


