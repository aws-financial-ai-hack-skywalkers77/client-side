import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, PlayIcon } from "lucide-react"

import { InvoiceList } from "@/components/InvoiceList"
import { DetailsModal } from "@/components/DetailsModal"
import { getInvoiceById, getInvoices, runInvoiceWorkflow } from "@/api"
import type { Invoice } from "@/types"
import type { LayoutContextValue } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useWorkflowReport } from "@/context/WorkflowReportContext"

const PAGE_SIZE = 10

export function Invoices() {
  const navigate = useNavigate()
  const { searchTerm } = useOutletContext<LayoutContextValue>()
  const { setInvoiceBatch } = useWorkflowReport()
  const [page, setPage] = useState(1)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsData, setDetailsData] = useState<unknown>(null)
  const [detailsTitle, setDetailsTitle] = useState("Invoice Details")
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([])
  const [workflowRunning, setWorkflowRunning] = useState(false)
  const [workflowProgress, setWorkflowProgress] = useState(0)
  const progressTimer = useRef<number | null>(null)

  const selectedSet = useMemo(() => new Set(selectedInvoiceIds), [selectedInvoiceIds])

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

  useEffect(() => {
    if (!workflowRunning) {
      setWorkflowProgress(0)
      if (progressTimer.current !== null) {
        window.clearInterval(progressTimer.current)
        progressTimer.current = null
      }
      return
    }

    progressTimer.current = window.setInterval(() => {
      setWorkflowProgress((prev) => {
        if (prev >= 92) return prev
        return prev + Math.random() * 6 + 2
      })
    }, 450)

    return () => {
      if (progressTimer.current !== null) {
        window.clearInterval(progressTimer.current)
        progressTimer.current = null
      }
    }
  }, [workflowRunning])

  useEffect(
    () => () => {
      if (progressTimer.current !== null) {
        window.clearInterval(progressTimer.current)
      }
    },
    [],
  )

  const handleViewDetails = useCallback(async (invoice: Invoice) => {
    try {
      const metadata = await getInvoiceById(invoice.id)
      setDetailsTitle(`Invoice ${metadata.invoice_id ?? "Unknown"}`)
      setDetailsData(metadata)
      setDetailsOpen(true)
    } catch (error) {
      console.error(error)
      toast.error("Unable to load invoice details")
    }
  }, [])

  const handleToggleSelect = useCallback((invoice: Invoice, selected: boolean) => {
    setSelectedInvoiceIds((prev) => {
      if (selected) {
        if (prev.includes(invoice.id)) return prev
        return [...prev, invoice.id]
      }
      return prev.filter((id) => id !== invoice.id)
    })
  }, [])

  const handleToggleSelectAll = useCallback((visibleInvoices: Invoice[], selected: boolean) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev)
      visibleInvoices.forEach((invoice) => {
        if (selected) {
          next.add(invoice.id)
        } else {
          next.delete(invoice.id)
        }
      })
      return Array.from(next)
    })
  }, [])

  const handleRunWorkflow = useCallback(async () => {
    if (selectedInvoiceIds.length === 0) {
      toast.info("Select at least one invoice to run the workflow.")
      return
    }

    setWorkflowRunning(true)
    setWorkflowProgress(0)
    try {
      const batch = await runInvoiceWorkflow(selectedInvoiceIds)
      setWorkflowProgress(100)
      setInvoiceBatch(batch)
      toast.success(`Workflow completed for ${batch.invoices.length} invoice${batch.invoices.length === 1 ? "" : "s"}.`)
      setSelectedInvoiceIds([])
      navigate("/reports")
    } catch (error) {
      console.error(error)
      toast.error("Workflow run failed. Please try again.")
    } finally {
      setWorkflowRunning(false)
    }
  }, [navigate, selectedInvoiceIds, setInvoiceBatch])

  const selectedVisibleCount = useMemo(
    () => invoices.filter((invoice) => selectedSet.has(invoice.id)).length,
    [invoices, selectedSet],
  )

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Bulk workflow</p>
            <h2 className="text-lg font-semibold text-foreground">
              Run compliance evaluation across selected invoices
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose the invoices that need AI-assisted validation and launch the workflow in a single action.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="gap-2"
            disabled={workflowRunning || selectedInvoiceIds.length === 0}
            onClick={handleRunWorkflow}
          >
            {workflowRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running workflow...
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4" />
                Run workflow ({selectedInvoiceIds.length})
              </>
            )}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>
            Selected invoices this page:{" "}
            <span className="font-semibold text-foreground">{selectedVisibleCount}</span>
          </span>
          <span>
            Total selected:{" "}
            <span className="font-semibold text-foreground">{selectedInvoiceIds.length}</span>
          </span>
          <span>
            Available this page: <span className="font-semibold text-foreground">{invoices.length}</span>
          </span>
        </div>
        {workflowRunning ? (
          <div className="space-y-2 rounded-xl border border-primary/30 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
            <Progress value={workflowProgress} />
            <p className="text-xs text-muted-foreground">
              Orchestrating document checks, rules evaluation, and contract clause matching...
            </p>
          </div>
        ) : null}
      </div>

      <InvoiceList
        invoices={invoices}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onViewDetails={handleViewDetails}
        searchTerm={searchTerm}
        onRowClick={handleViewDetails}
        selectable
        selectedIds={selectedInvoiceIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
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

