import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import type { InvoiceWorkflowBatch } from "@/types"
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "@/lib/storage"

type WorkflowReportContextValue = {
  invoiceBatch: InvoiceWorkflowBatch | null
  setInvoiceBatch: (batch: InvoiceWorkflowBatch | null) => void
  clearReportData: () => void
}

const WorkflowReportContext = createContext<WorkflowReportContextValue | undefined>(undefined)

type WorkflowReportProviderProps = {
  children: ReactNode
}

// Load workflow batch from localStorage with validation
const loadWorkflowBatch = (): InvoiceWorkflowBatch | null => {
  const parsed = loadFromStorage<InvoiceWorkflowBatch>(STORAGE_KEYS.WORKFLOW_BATCH)
  // Validate the structure
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.invoices)) {
    return parsed
  }
  return null
}

export function WorkflowReportProvider({ children }: WorkflowReportProviderProps) {
  // Initialize state from localStorage
  const [invoiceBatch, setInvoiceBatchState] = useState<InvoiceWorkflowBatch | null>(() => {
    return loadWorkflowBatch()
  })

  // Save to localStorage whenever invoiceBatch changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.WORKFLOW_BATCH, invoiceBatch)
  }, [invoiceBatch])

  // Wrapper function that updates both state and localStorage
  const setInvoiceBatch = (batch: InvoiceWorkflowBatch | null) => {
    setInvoiceBatchState(batch)
    saveToStorage(STORAGE_KEYS.WORKFLOW_BATCH, batch)
  }

  // Function to explicitly clear report data
  const clearReportData = () => {
    setInvoiceBatchState(null)
    saveToStorage(STORAGE_KEYS.WORKFLOW_BATCH, null)
  }

  const value = useMemo<WorkflowReportContextValue>(
    () => ({
      invoiceBatch,
      setInvoiceBatch,
      clearReportData,
    }),
    [invoiceBatch],
  )

  return <WorkflowReportContext.Provider value={value}>{children}</WorkflowReportContext.Provider>
}

export function useWorkflowReport() {
  const context = useContext(WorkflowReportContext)
  if (context === undefined) {
    throw new Error("useWorkflowReport must be used within a WorkflowReportProvider")
  }
  return context
}


