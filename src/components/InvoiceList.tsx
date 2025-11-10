import { useMemo } from "react"
import { FileText, Building2, Hash, DollarSign, MapPin, FileText as SummaryIcon, Calendar, AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import type { Invoice } from "@/types"

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
const truncate = (text: string, maxLength: number): string => {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

// Not Available component
const NotAvailable = () => (
  <div className="flex items-center gap-1.5 text-sm text-orange-600 dark:text-orange-400">
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
  onViewDetails,
  searchTerm = "",
  onRowClick,
}: InvoiceListProps) {
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

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-1">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          {filteredInvoices.length} of {total} records
        </p>
      </div>

      <Card className="border-border shadow-sm bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground bg-transparent">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Invoice ID</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground bg-transparent">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>Seller Name</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground bg-transparent">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      <span>Tax ID</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground bg-transparent">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Amount</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground bg-transparent">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>Address</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground bg-transparent">
                    <div className="flex items-center gap-2">
                      <SummaryIcon className="h-4 w-4" />
                      <span>Summary</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground bg-transparent">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Updated</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading invoices...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => {
                    const totalAmount = (invoice.subtotal_amount ?? 0) + (invoice.tax_amount ?? 0)
                    
                    return (
                      <tr
                        key={invoice.id}
                        className="cursor-pointer transition-colors hover:bg-secondary/20 border-b border-border/30 last:border-b-0"
                        onClick={() => onRowClick?.(invoice)}
                      >
                        {/* Invoice ID Column */}
                        <td className="px-6 py-4">
                          {isEmpty(invoice.invoice_id) ? (
                            <NotAvailable />
                          ) : (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium text-foreground">
                                {invoice.invoice_id}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Seller Name Column */}
                        <td className="px-6 py-4">
                          {isEmpty(invoice.seller_name) ? (
                            <NotAvailable />
                          ) : (
                            <span className="text-sm text-foreground">
                              {truncate(invoice.seller_name, 30)}
                            </span>
                          )}
                        </td>

                        {/* Tax ID Column */}
                        <td className="px-6 py-4">
                          {isEmpty(invoice.tax_id) ? (
                            <NotAvailable />
                          ) : (
                            <span className="text-sm font-medium text-foreground font-mono">
                              {truncate(invoice.tax_id, 20)}
                            </span>
                          )}
                        </td>

                        {/* Amount Column */}
                        <td className="px-6 py-4 text-right">
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
                        <td className="px-6 py-4">
                          {isEmpty(invoice.seller_address) ? (
                            <NotAvailable />
                          ) : (
                            <span className="text-sm text-foreground">
                              {truncate(invoice.seller_address, 40)}
                            </span>
                          )}
                        </td>

                        {/* Summary Column */}
                        <td className="px-6 py-4">
                          {isEmpty(invoice.summary) ? (
                            <NotAvailable />
                          ) : (
                            <span className="text-sm text-foreground">
                              {truncate(invoice.summary, 50)}
                            </span>
                          )}
                        </td>

                        {/* Updated Column */}
                        <td className="px-6 py-4">
                          {isEmpty(invoice.updated_at) ? (
                            <NotAvailable />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {formatDate(invoice.updated_at)}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No invoices found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
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
