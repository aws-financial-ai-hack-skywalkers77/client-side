import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, PlayIcon, Info } from "lucide-react"

import { InvoiceList } from "@/components/InvoiceList"
import { DetailsModal } from "@/components/DetailsModal"
import { getInvoiceById, getInvoices, runInvoiceWorkflow } from "@/api"
import type { Invoice } from "@/types"
import type { LayoutContextValue } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useWorkflowReport } from "@/context/WorkflowReportContext"
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "@/lib/storage"
import { WorkflowDiagram } from "@/components/WorkflowDiagram"

const PAGE_SIZE = 10

type InvoicesPageState = {
  invoices: Invoice[]
  total: number
  page: number
  selectedInvoiceIds: number[]
}

export function Invoices() {
  const navigate = useNavigate()
  const { searchTerm } = useOutletContext<LayoutContextValue>()
  const { setInvoiceBatch } = useWorkflowReport()
  
  // Load persisted state from localStorage
  const persistedState = loadFromStorage<InvoicesPageState>(STORAGE_KEYS.INVOICES)
  
  const [page, setPage] = useState(persistedState?.page ?? 1)
  const [invoices, setInvoices] = useState<Invoice[]>(persistedState?.invoices ?? [])
  const [total, setTotal] = useState(persistedState?.total ?? 0)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>(persistedState?.selectedInvoiceIds ?? [])
  const [loading, setLoading] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsData, setDetailsData] = useState<unknown>(null)
  const [detailsTitle, setDetailsTitle] = useState("Invoice Details")
  const [workflowRunning, setWorkflowRunning] = useState(false)
  const [workflowProgress, setWorkflowProgress] = useState(0)
  const [workflowDiagramOpen, setWorkflowDiagramOpen] = useState(false)
  const progressTimer = useRef<number | null>(null)

  const selectedSet = useMemo(() => new Set(selectedInvoiceIds), [selectedInvoiceIds])

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    saveToStorage<InvoicesPageState>(STORAGE_KEYS.INVOICES, {
      invoices,
      total,
      page,
      selectedInvoiceIds,
    })
  }, [invoices, total, page, selectedInvoiceIds])

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
      
      // Create maps to match risk_percentage from batch to invoices
      const riskMapById = new Map<number, number | null>() // Map by database ID
      const riskMapByInvoiceId = new Map<string, number | null>() // Map by invoice_id string
      
      // Build mapping from batch reports
      // Note: risk_percentage can be 0 (valid), null, or undefined (not set)
      batch.invoices.forEach((report, index) => {
        console.log(`Processing report ${index}:`, {
          invoice_id: report.invoice_id,
          invoice_db_id: report.invoice_db_id,
          risk_percentage: report.risk_percentage,
          risk_assessment_score: report.risk_assessment_score,
        })
        
        // Always map by invoice_id string (works even without db_id)
        // Include 0 and null as valid values - only skip if truly undefined
        if (report.invoice_id && report.risk_percentage !== undefined) {
          riskMapByInvoiceId.set(report.invoice_id, report.risk_percentage)
          console.log(`Mapped ${report.invoice_id} -> risk_percentage: ${report.risk_percentage}`)
        }
        
        // Also map by invoice_db_id if available
        if (report.invoice_db_id !== undefined && report.risk_percentage !== undefined) {
          riskMapById.set(report.invoice_db_id, report.risk_percentage)
          console.log(`Mapped invoice_db_id ${report.invoice_db_id} -> risk_percentage: ${report.risk_percentage}`)
        }
        
        // Fallback: map by position if invoice_db_id not available
        // This assumes backend returns reports in same order as requested IDs
        if (report.invoice_db_id === undefined && index < selectedInvoiceIds.length && report.risk_percentage !== undefined) {
          const dbId = selectedInvoiceIds[index]
          riskMapById.set(dbId, report.risk_percentage)
          console.log(`Mapped by position: dbId ${dbId} -> risk_percentage: ${report.risk_percentage}`)
        }
      })
      
      console.log('Risk maps:', {
        byId: Array.from(riskMapById.entries()),
        byInvoiceId: Array.from(riskMapByInvoiceId.entries()),
      })
      
      // Refresh invoices from backend first
      const response = await getInvoices({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
      
      console.log('Fetched invoices:', response.invoices.map(inv => ({
        id: inv.id,
        invoice_id: inv.invoice_id,
        risk_percentage: inv.risk_percentage,
      })))
      
      // Merge the risk_percentage data from workflow results into the fetched invoices
      const updatedInvoices = response.invoices.map((invoice) => {
        let riskPercentage: number | null | undefined = undefined
        
        // Try to find risk_percentage by database ID first (most reliable)
        riskPercentage = riskMapById.get(invoice.id)
        
        // Fallback: try by invoice_id string (this should catch most cases)
        if (riskPercentage === undefined && invoice.invoice_id) {
          riskPercentage = riskMapByInvoiceId.get(invoice.invoice_id)
        }
        
        // If we found a risk percentage (including null) from workflow, use it
        if (riskPercentage !== undefined) {
          console.log(`Updating invoice ${invoice.invoice_id} (ID: ${invoice.id}) with risk_percentage: ${riskPercentage}`)
          return { ...invoice, risk_percentage: riskPercentage }
        }
        
        // Keep existing risk_percentage if no match found
        console.log(`No risk_percentage match for invoice ${invoice.invoice_id} (ID: ${invoice.id}), keeping existing: ${invoice.risk_percentage}`)
        return invoice
      })
      
      console.log('Updated invoices:', updatedInvoices.map(inv => ({
        id: inv.id,
        invoice_id: inv.invoice_id,
        risk_percentage: inv.risk_percentage,
      })))
      
      // Update state with merged invoices (this will trigger localStorage save)
      setInvoices(updatedInvoices)
      setTotal(response.total)
      
      toast.success(`Workflow completed for ${batch.invoices.length} invoice${batch.invoices.length === 1 ? "" : "s"}.`)
      setSelectedInvoiceIds([])
      navigate("/reports")
    } catch (error) {
      console.error(error)
      toast.error("Workflow run failed. Please try again.")
    } finally {
      setWorkflowRunning(false)
    }
  }, [navigate, selectedInvoiceIds, setInvoiceBatch, fetchInvoices])

  const selectedVisibleCount = useMemo(
    () => invoices.filter((invoice) => selectedSet.has(invoice.id)).length,
    [invoices, selectedSet],
  )

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border bg-card pb-4 mb-4 px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#232F3E] dark:text-[#FFB84D] mb-1">Bulk workflow</p>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Run compliance evaluation across selected invoices
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose the invoices that need AI-assisted validation and launch the workflow in a single action.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => setWorkflowDiagramOpen(true)}
            >
              <Info className="h-4 w-4" />
              View Workflow Process
            </Button>
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
          <div className="space-y-2 rounded-lg border border-[#FF9900]/30 dark:border-[#FFB84D]/30 bg-card/80 dark:bg-[#1A232E]/80 p-3 shadow-sm backdrop-blur-sm">
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

      <WorkflowDiagram open={workflowDiagramOpen} onOpenChange={setWorkflowDiagramOpen} />
    </>
  )
}

