import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FileText, Building2, Hash, DollarSign, MapPin, FileText as SummaryIcon, Calendar, AlertCircle, Loader2, Sparkles, TrendingUp, CheckCircle2, XCircle, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import type { Invoice } from "@/types"
import { InlineQueryCell, InlineQueryOverlay } from "@/components/InlineQueryCell"
import { queryInvoiceAnalytics, getInvoiceDownloadUrl } from "@/api"
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

// Get risk level from percentage
const getRiskLevel = (percentage: number | null | undefined): { level: "good" | "low" | "medium" | "high"; label: string } => {
  if (percentage === null || percentage === undefined || percentage === 0) {
    return { level: "good", label: "Good" }
  }
  if (percentage <= 30) {
    return { level: "low", label: "Low" }
  }
  if (percentage <= 70) {
    return { level: "medium", label: "Medium" }
  }
  return { level: "high", label: "High" }
}

// Get risk color classes
const getRiskColorClasses = (level: "good" | "low" | "medium" | "high"): string => {
  switch (level) {
    case "good":
      return "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
    case "low":
      return "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
    case "medium":
      return "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
    case "high":
      return "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
  }
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
  const handleViewPdf = useCallback(async (invoiceId: number, event: React.MouseEvent) => {
    event.stopPropagation()
    
    setLoadingPdfIds((prev) => {
      // Check if already loading
      if (prev.has(invoiceId)) return prev
      const next = new Set(prev)
      next.add(invoiceId)
      return next
    })
    
    try {
      console.log("Fetching PDF URL for invoice ID:", invoiceId)
      const response = await getInvoiceDownloadUrl(invoiceId)
      console.log("PDF URL response:", response)
      if (response.success && response.presigned_url) {
        window.open(response.presigned_url, "_blank")
      } else {
        toast.error("Failed to retrieve PDF URL")
      }
    } catch (error: any) {
      console.error("Error fetching PDF URL:", error)
      console.error("Error response:", error?.response?.data)
      console.error("Error status:", error?.response?.status)
      console.error("Full error:", error)
      // Error toast is already shown by API client interceptor, but add more context
      if (error?.response?.status === 404) {
        toast.error(`Invoice not found (ID: ${invoiceId})`)
      } else if (error?.response?.status) {
        toast.error(`Failed to load PDF (Status: ${error.response.status})`)
      }
    } finally {
      setLoadingPdfIds((prev) => {
        const next = new Set(prev)
        next.delete(invoiceId)
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
                      <span>Risk %</span>
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
                    
                    const riskInfo = getRiskLevel(invoice.risk_percentage)
                    
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
                                onClick={(event) => handleViewPdf(invoice.id, event)}
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

                        {/* Risk Percentage Column */}
                        <td className="px-3 py-2 border-r border-border">
                          {invoice.risk_percentage === null || invoice.risk_percentage === undefined ? (
                            <NotAvailable />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border ${getRiskColorClasses(riskInfo.level)}`}
                              >
                                {riskInfo.label}
                              </span>
                              <span className="text-sm font-medium text-foreground">
                                {typeof invoice.risk_percentage === "number" 
                                  ? invoice.risk_percentage.toFixed(2)
                                  : invoice.risk_percentage}%
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Mistakes Column */}
                        <td className="px-3 py-2 border-r border-border">
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
                            } else if (status === "no-violations") {
                              return (
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                    No mistake
                                  </span>
                                </div>
                              )
                            } else {
                              return (
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm text-muted-foreground">
                                    Not checked
                                  </span>
                                </div>
                              )
                            }
                          })()}
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

                        {/* Action Column */}
                        <td className="relative px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                          className="group gap-3 rounded-full border-primary/40 bg-primary/5 px-3 py-2 text-left text-primary shadow-sm transition hover:border-primary/50 hover:bg-primary/10 hover:text-neutral-700"
                            onClick={(event) => {
                              event.stopPropagation()
                              const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect()
                              setActiveQuery((current) =>
                                current?.id === invoice.id ? null : { id: invoice.id, anchor: rect },
                              )
                            }}
                            disabled={loading}
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary/20">
                              <Sparkles className="h-3.5 w-3.5" />
                            </span>
                            <span className="flex flex-col items-start leading-tight">
                            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80 transition-colors group-hover:text-neutral-700">
                                DocuFlow AI
                              </span>
                              <span className="text-xs font-medium transition-colors group-hover:text-neutral-700">
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
