import { useCallback, useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { toast } from "sonner"

import { InvoiceList } from "@/components/InvoiceList"
import { DetailsModal } from "@/components/DetailsModal"
import { getInvoiceById, getInvoices } from "@/api"
import type { Invoice } from "@/types"
import type { LayoutContextValue } from "@/components/layout/AppLayout"

const PAGE_SIZE = 10

export function Invoices() {
  const { searchTerm } = useOutletContext<LayoutContextValue>()
  const [page, setPage] = useState(1)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsData, setDetailsData] = useState<unknown>(null)
  const [detailsTitle, setDetailsTitle] = useState("Invoice Details")

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getInvoices({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
      setInvoices(response.invoices)
      setTotal(response.total)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load invoices")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  const handleViewDetails = useCallback(async (invoice: Invoice) => {
    try {
      const metadata = await getInvoiceById(invoice.invoice_id)
      setDetailsTitle(`Invoice ${metadata.invoice_id}`)
      setDetailsData(metadata)
      setDetailsOpen(true)
    } catch (error) {
      console.error(error)
      toast.error("Unable to load invoice details")
    }
  }, [])

  return (
    <>
      <InvoiceList
        invoices={invoices}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onViewDetails={handleViewDetails}
        searchTerm={searchTerm}
      />

      <DetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title={detailsTitle}
        data={detailsData}
        description="Full metadata extracted from the invoice document."
      />
    </>
  )
}

