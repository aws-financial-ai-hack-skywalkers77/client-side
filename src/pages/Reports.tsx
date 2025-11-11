import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, ArrowLeft, Clock, Download, FileText, Link2 } from "lucide-react"

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
import { useWorkflowReport } from "@/context/WorkflowReportContext"
import type { InvoiceWorkflowContractClause, InvoiceWorkflowReport, InvoiceWorkflowViolation } from "@/types"

type FlattenedViolation = InvoiceWorkflowViolation & {
  invoice_id: string
  processed_at?: string
}

type FlattenedClause = InvoiceWorkflowContractClause & {
  invoice_id: string
}

export function Reports() {
  const navigate = useNavigate()
  const { invoiceBatch } = useWorkflowReport()

  const hasData = invoiceBatch && invoiceBatch.invoices.length > 0

  const {
    totalViolations,
    processedInvoices,
    totalLineItems,
    totalRulesEvaluated,
    averageNextRunHours,
    violationBreakdown,
    flattenedViolations,
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
        flattenedViolations: [] as FlattenedViolation[],
        flattenedClauses: [] as FlattenedClause[],
      }
    }

    const violationMap = new Map<string, number>()
    let violations = 0
    let lines = 0
    let rules = 0
    let runHoursAccumulator = 0
    let runHoursSamples = 0
    const violationRows: FlattenedViolation[] = []
    const clauseRows: FlattenedClause[] = []

    invoiceBatch.invoices.forEach((invoice: InvoiceWorkflowReport) => {
      violations += invoice.violations?.length ?? 0
      invoice.violations?.forEach((violation) => {
        const key = violation.violation_type ?? "Unknown violation"
        violationMap.set(key, (violationMap.get(key) ?? 0) + 1)
        violationRows.push({
          ...violation,
          invoice_id: invoice.invoice_id,
          processed_at: invoice.processed_at,
        })
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
      flattenedViolations: violationRows,
      flattenedClauses: clauseRows,
    }
  }, [invoiceBatch])

  const handleExportPdf = () => {
    window.print()
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-border bg-card/60 p-12 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-gradient-to-r from-primary/10 via-white to-primary/5 p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Invoice workflow report</p>
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
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Invoices processed</CardTitle>
            <CardDescription>Batch size for the latest workflow run.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{processedInvoices}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Violations detected</CardTitle>
            <CardDescription>Total applied rules that flagged exceptions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
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
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Line items evaluated</CardTitle>
            <CardDescription>Coverage across all purchase lines.</CardDescription>
          </CardHeader>
        <CardContent className="space-y-1">
            <p className="text-3xl font-semibold text-foreground">{totalLineItems}</p>
          <p className="text-xs text-muted-foreground">
            {totalRulesEvaluated} rules executed across the batch.
          </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Average next run</CardTitle>
            <CardDescription>Scheduling guidance from the backend.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <p className="text-2xl font-semibold text-foreground">
              {averageNextRunHours !== null ? `${averageNextRunHours} hrs` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold">Violation detail</CardTitle>
            <CardDescription>Rule breaches grouped by invoice and contract references.</CardDescription>
          </div>
          <Badge variant="destructive" className="gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            {totalViolations} flagged
          </Badge>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[340px]">
            <div className="min-w-full space-y-3">
              {flattenedViolations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                  The workflow did not report any violations for this batch.
                </div>
              ) : (
                flattenedViolations.map((violation, index) => (
                  <div
                    key={`${violation.invoice_id}-${violation.line_id ?? index}`}
                    className="rounded-xl border border-border bg-card/70 p-4 shadow-sm transition hover:border-primary/40 hover:shadow"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Invoice {violation.invoice_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Processed{" "}
                          {violation.processed_at
                            ? new Date(violation.processed_at).toLocaleString()
                            : generatedAt}
                        </p>
                      </div>
                      <Badge variant="destructive">{violation.violation_type}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                      {violation.line_id ? (
                        <span>
                          <strong>Line:</strong> {violation.line_id}
                        </span>
                      ) : null}
                      {violation.contract_clause_reference ? (
                        <span>
                          <strong>Clause:</strong> {violation.contract_clause_reference}
                        </span>
                      ) : null}
                      {violation.expected_price !== undefined && violation.actual_price !== undefined ? (
                        <span>
                          <strong>Expected vs actual:</strong>{" "}
                          <span className="text-foreground">
                            {violation.expected_price} → {violation.actual_price}
                          </span>
                        </span>
                      ) : null}
                      {violation.difference !== undefined ? (
                        <span>
                          <strong>Difference:</strong>{" "}
                          <span className="text-foreground">{violation.difference}</span>
                        </span>
                      ) : null}
                    </div>
                    {violation.applied_rule ? (
                      <pre className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
{JSON.stringify(violation.applied_rule, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold">Contract clause alignment</CardTitle>
            <CardDescription>Top clause matches surfaced per invoice.</CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Link2 className="h-3.5 w-3.5" />
            {flattenedClauses.length} links
          </Badge>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[260px]">
            <div className="grid gap-2 text-sm">
              {topClauses.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Clause recommendations will appear once the workflow matches invoices to contracts.
                </div>
              ) : (
                topClauses.map((clause, index) => (
                  <div
                    key={`${clause.invoice_id}-${clause.contract_id}-${index}`}
                    className="flex flex-wrap items-center justify-between rounded-lg border border-border/60 bg-card/80 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        Invoice {clause.invoice_id}
                      </Badge>
                      <span className="font-medium text-foreground">{clause.contract_id}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      {clause.similarity !== undefined ? `${Math.round((clause.similarity ?? 0) * 100)}%` : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}


