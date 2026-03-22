import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FileText, Building2, Hash, DollarSign, MapPin, FileText as SummaryIcon, Calendar, AlertCircle, Loader2, Sparkles, TrendingUp, CheckCircle2, XCircle, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import type { Invoice } from "@/types"
import { InlineQueryCell, InlineQueryOverlay } from "@/components/InlineQueryCell"
import { openInvoicePdfInNewTab, queryInvoiceAnalytics } from "@/api"
import {
  formatRiskAssessmentScoreRaw,
  resolveRiskDisplay,
  riskBadgeClasses,
} from "@/lib/riskDisplay"
import { useWorkflowReport } from "@/context/WorkflowReportContext"
import { toast } from "sonner"

type InvoiceListProps = {
  invoices: Invoice[]
  loading?: boolean
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onViewDetails: (invoice: Invoice) => void
  searchTerm?: string
  onRowClick?: (invoice: Invoice) => void
  selectable?: boolean
  selectedIds?: number[]
  onToggleSelect?: (invoice: Invoice, selected: boolean) => void
  onToggleSelectAll?: (invoices: Invoice[], selected: boolean) => void
}

// Check if value is null or empty
const isEmpty = (value: string | number | null | undefined): boolean => {
  if (value === null || value === undefined) return true
  if (typeof value === "string" && value.trim() === "") return true
  return false
}

// Format amount with currency
const formatAmount = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return ""
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format date
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return ""
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateString
  }
}

// Truncate text with ellipsis
const truncate = (text: string | null | undefined, maxLength: number): string => {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

const getInvoiceLabel = (invoice: Invoice): string => {
  const base =
    invoice.invoice_id?.trim() && invoice.invoice_id.trim().length > 0
      ? invoice.invoice_id.trim()
      : `Invoice #${invoice.id}`
  return truncate(base, 22)
}

// Not Available component
const NotAvailable = () => (
  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
    <AlertCircle className="h-4 w-4 flex-shrink-0" />
    <span className="whitespace-nowrap">Not available</span>
  </div>
)

export function InvoiceList({
  invoices,
  loading = false,
  total,
  page,
  pageSize,
  onPageChange,
  onViewDetails: _onViewDetails,
  searchTerm = "",
  onRowClick,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
}: InvoiceListProps) {
  const { invoiceBatch } = useWorkflowReport()
  
  // Create a map of invoice_id to violations count for quick lookup
  const violationsMap = useMemo(() => {
    const map = new Map<string, number>()
    if (invoiceBatch?.invoices) {
      invoiceBatch.invoices.forEach((report) => {
        const violationsCount = report.violations?.length ?? 0
        map.set(report.invoice_id, violationsCount)
      })
    }
    return map
  }, [invoiceBatch])

  // Check if invoice has been processed and has violations
  const getMistakesStatus = useCallback((invoice: Invoice): "has-violations" | "no-violations" | "not-checked" => {
    const invoiceId = invoice.invoice_id
    if (!invoiceId) return "not-checked"
    
    // Check if invoice has been processed (exists in workflow batch)
    const hasBeenProcessed = violationsMap.has(invoiceId)
    if (!hasBeenProcessed) return "not-checked"
    
    const violationsCount = violationsMap.get(invoiceId) ?? 0
    return violationsCount > 0 ? "has-violations" : "no-violations"
  }, [violationsMap])

  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices
    const term = searchTerm.toLowerCase()
    return invoices.filter((invoice) =>
      [
        invoice.invoice_id,
        invoice.seller_name,
        invoice.summary,
        invoice.tax_id,
        invoice.seller_address,
        invoice.compliance_status,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term)),
    )
  }, [invoices, searchTerm])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const [activeQuery, setActiveQuery] = useState<{ id: number; anchor: DOMRect } | null>(null)
  const [loadingPdfIds, setLoadingPdfIds] = useState<Set<number>>(new Set())
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  
  // Handle PDF view with S3 presigned URL
  const handleViewPdf = useCallback(async (invoice: Invoice, event: React.MouseEvent) => {
    event.stopPropagation()
    const rowKey = invoice.id

    setLoadingPdfIds((prev) => {
      if (prev.has(rowKey)) return prev
      const next = new Set(prev)
      next.add(rowKey)
      return next
    })

    try {
      await openInvoicePdfInNewTab({
        invoiceDbId: invoice.id,
        invoiceBusinessId: invoice.invoice_id,
      })
    } catch {
      toast.error("Could not open PDF — check API base URL (FastAPI host) and CORS.")
    } finally {
      setLoadingPdfIds((prev) => {
        const next = new Set(prev)
        next.delete(rowKey)
        return next
      })
    }
  }, [])
  const headerCheckboxRef = useRef<HTMLInputElement>(null)
  const selectedOnPage = useMemo(
    () => filteredInvoices.filter((invoice) => selectedSet.has(invoice.id)).length,
    [filteredInvoices, selectedSet],
  )
  const allOnPageSelected = filteredInvoices.length > 0 && selectedOnPage === filteredInvoices.length
  const columnCount = selectable ? 11 : 10

  useEffect(() => {
    if (!selectable || !headerCheckboxRef.current) return
    headerCheckboxRef.current.indeterminate =
      selectedOnPage > 0 && selectedOnPage < filteredInvoices.length
  }, [filteredInvoices.length, selectable, selectedOnPage])

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3 px-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground mb-0.5">Invoices</h1>
          <p className="text-xs text-muted-foreground">
            {filteredInvoices.length} of {total} records
          </p>
        </div>
      </div>

      <div className="w-full">
        <Card className="border-x-0 border-t-0 border-border shadow-none bg-card rounded-none">
        <CardContent className="p-0">
          <div className="relative overflow-x-auto overflow-y-visible">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b-2 border-border">
                  {selectable ? (
                    <th className="w-12 px-3 py-2 text-left text-sm font-semibold text-foreground border-r border-border">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        checked={filteredInvoices.length > 0 && allOnPageSelected}
                        onChange={(event) =>
                          onToggleSelectAll?.(filteredInvoices, event.target.checked)
                        }
                      />
                    </th>
                  ) : null}
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-r border-border whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Invoice ID</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-r border-border whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>Seller Name</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-r border-border whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      <span>Tax ID</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-foreground border-r border-border whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Amount</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-r border-border whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>Address</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-r border-border whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <SummaryIcon className="h-4 w-4" />
                      <span>Summary</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-r border-border whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Risk</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-r border-border whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Mistakes</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-r border-border whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Updated</span>
                    </div>
                  </th>
                  <th className="w-32 px-3 py-2 text-right text-sm font-semibold text-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columnCount} className="px-3 py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading invoices...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => {
                    const totalAmount = (invoice.subtotal_amount ?? 0) + (invoice.tax_amount ?? 0)

                    const riskInfo = resolveRiskDisplay({
                      risk_tier: invoice.risk_tier,
                      risk_percentage: invoice.risk_percentage,
                    })
                    const scoreRaw = formatRiskAssessmentScoreRaw(invoice.risk_assessment_score)
                    const hasRiskData =
                      (typeof invoice.risk_tier === "string" && invoice.risk_tier.trim() !== "") ||
                      typeof invoice.risk_percentage === "number" ||
                      typeof invoice.risk_assessment_score === "number"

                    return (
                      <tr
                        key={invoice.id}
                        className="relative cursor-pointer transition-colors hover:bg-muted/40 border-b border-border/50"
                        onClick={() => onRowClick?.(invoice)}
                      >
                        {selectable ? (
                          <td className="px-3 py-2 border-r border-border">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              checked={selectedSet.has(invoice.id)}
                              onChange={(event) => onToggleSelect?.(invoice, event.target.checked)}
                              onClick={(event) => event.stopPropagation()}
                            />
                          </td>
                        ) : null}
                        {/* Invoice ID Column */}
                        <td className="px-3 py-2 border-r border-border">
                          {isEmpty(invoice.invoice_id) ? (
                            <NotAvailable />
                          ) : (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium text-foreground">
                                {invoice.invoice_id}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-accent/10 hover:text-accent transition-colors disabled:opacity-50 ml-1"
                                onClick={(event) => handleViewPdf(invoice, event)}
                                disabled={loadingPdfIds.has(invoice.id) || loading}
                                title="View PDF"
                              >
                                {loadingPdfIds.has(invoice.id) ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-accent transition-colors" />
                                )}
                              </Button>
                            </div>
                          )}
                        </td>

                        {/* Seller Name Column */}
                        <td className="px-3 py-2 border-r border-border">
                          {isEmpty(invoice.seller_name) ? (
                            <NotAvailable />
                          ) : (
                            <span className="text-sm text-foreground">
                              {truncate(invoice.seller_name, 30)}
                            </span>
                          )}
                        </td>

                        {/* Tax ID Column */}
                        <td className="px-3 py-2 border-r border-border">
                          {isEmpty(invoice.tax_id) ? (
                            <NotAvailable />
                          ) : (
                            <span className="text-sm font-medium text-foreground font-mono">
                              {truncate(invoice.tax_id, 20)}
                            </span>
                          )}
                        </td>

                        {/* Amount Column */}
                        <td className="px-3 py-2 text-right border-r border-border">
                          {isEmpty(invoice.subtotal_amount) && isEmpty(invoice.tax_amount) ? (
                            <div className="flex items-center justify-end">
                              <NotAvailable />
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-foreground">
                              {formatAmount(totalAmount)}
                            </span>
                          )}
                        </td>

                        {/* Address Column */}
                        <td className="px-3 py-2 border-r border-border">
                          {isEmpty(invoice.seller_address) ? (
                            <NotAvailable />
                          ) : (
                            <span 
                              className="text-sm text-foreground cursor-help" 
                              title={invoice.seller_address ?? undefined}
                            >
                              {truncate(invoice.seller_address, 40)}
                            </span>
                          )}
                        </td>

                        {/* Summary Column */}
                        <td className="px-3 py-2 border-r border-border">
                          {isEmpty(invoice.summary) ? (
                            <NotAvailable />
                          ) : (
                            <span 
                              className="text-sm text-foreground cursor-help" 
                              title={invoice.summary ?? undefined}
                            >
                              {truncate(invoice.summary, 50)}
                            </span>
                          )}
                        </td>

                        {/* Risk (tier + optional score / %) */}
                        <td className="px-3 py-2 border-r border-border">
                          {!hasRiskData ? (
                            <NotAvailable />
                          ) : (
                            <div className="flex flex-col gap-0.5 items-start">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border ${riskBadgeClasses(riskInfo.level)}`}
                                >
                                  {riskInfo.label}
                                </span>
                                {typeof invoice.risk_percentage === "number" ? (
                                  <span className="text-sm font-medium text-foreground">
                                    {invoice.risk_percentage.toFixed(2)}%
                                  </span>
                                ) : null}
                              </div>
                              {scoreRaw ? (
                                <span className="text-[10px] text-muted-foreground">score {scoreRaw}</span>
                              ) : null}
                            </div>
                          )}
                        </td>

                        {/* Mistakes Column */}
                        <td className="px-3 py-2 border-r border-border">
                          <div className="flex flex-col gap-1 items-start">
                            {(() => {
                              const status = getMistakesStatus(invoice)
                              if (status === "has-violations") {
                                return (
                                  <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                      Mistakes
                                    </span>
                                  </div>
                                )
                              }
                              if (status === "no-violations") {
                                return (
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                      No mistake
                                    </span>
                                  </div>
                                )
                              }
                              return (
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm text-muted-foreground">
                                    Not checked
                                  </span>
                                </div>
                              )
                            })()}
                            {invoice.compliance_status ? (
                              <span
                                className="inline-flex max-w-[140px] truncate rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                title={invoice.compliance_status}
                              >
                                {invoice.compliance_status.replace(/_/g, " ")}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Updated Column */}
                        <td className="px-3 py-2 border-r border-border">
                          {isEmpty(invoice.updated_at) ? (
                            <NotAvailable />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {formatDate(invoice.updated_at)}
                            </span>
                          )}
                        </td>

                        {/* Action Column — fixed footprint so every row matches */}
                        <td className="relative w-[220px] min-w-[220px] max-w-[220px] px-3 py-2 text-right align-middle">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="group h-[52px] w-full min-h-[52px] max-h-[52px] gap-2 rounded-full border-primary/40 bg-primary/5 px-3 py-0 text-left text-primary shadow-sm transition hover:border-primary/50 hover:bg-primary/10 hover:text-neutral-700"
                            onClick={(event) => {
                              event.stopPropagation()
                              const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect()
                              setActiveQuery((current) =>
                                current?.id === invoice.id ? null : { id: invoice.id, anchor: rect },
                              )
                            }}
                            disabled={loading}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary/20">
                              <Sparkles className="h-3.5 w-3.5" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5 leading-tight text-left">
                              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80 transition-colors group-hover:text-neutral-700">
                                DocuFlow AI
                              </span>
                              <span className="line-clamp-2 max-h-8 w-full text-xs font-medium transition-colors group-hover:text-neutral-700">
                                Ask about {getInvoiceLabel(invoice)}
                              </span>
                            </span>
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={columnCount} className="px-3 py-12 text-center text-muted-foreground">
                      No invoices found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </div>

      {activeQuery ? (
        <InlineQueryOverlay
          anchor={{
            top: activeQuery.anchor.top,
            bottom: activeQuery.anchor.bottom,
            left: activeQuery.anchor.left,
            width: activeQuery.anchor.width,
          }}
          onDismiss={() => setActiveQuery(null)}
        >
          <InlineQueryCell
            title="Invoice Analytics"
            description="Ask about this invoice to surface AI-powered insights."
            placeholder="Ask about this invoice..."
            onDismiss={() => setActiveQuery(null)}
            onSubmit={async (prompt) => {
              const response = await queryInvoiceAnalytics(activeQuery.id, prompt)
              return response
            }}
          />
        </InlineQueryOverlay>
      ) : null}

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground px-6">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
