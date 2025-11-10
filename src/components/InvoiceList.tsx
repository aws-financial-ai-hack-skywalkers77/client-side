import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term)),
    )
  }, [invoices, searchTerm])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold">Invoice Library</CardTitle>
          <p className="text-sm text-muted-foreground">
            Extracted invoice metadata ready for review.
          </p>
        </div>
        <Badge variant="secondary">
          {filteredInvoices.length} of {total} records
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Invoice ID</th>
                <th className="px-4 py-2 text-left font-semibold">Seller</th>
                <th className="px-4 py-2 text-left font-semibold">Summary</th>
                <th className="px-4 py-2 text-left font-semibold">Created</th>
                <th className="px-4 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="cursor-pointer bg-card transition hover:bg-secondary/30"
                    onClick={() => onRowClick?.(invoice)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {invoice.invoice_id}
                    </td>
                    <td className="px-4 py-3">{invoice.seller_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {invoice.summary || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(invoice.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation()
                          onViewDetails(invoice)
                        }}
                      >
                        View details
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No invoices found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
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
      </CardContent>
    </Card>
  )
}

