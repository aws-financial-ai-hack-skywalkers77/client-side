import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

import type { InvoiceWorkflowBatch } from "@/types"

type WorkflowReportContextValue = {
  invoiceBatch: InvoiceWorkflowBatch | null
  setInvoiceBatch: (batch: InvoiceWorkflowBatch | null) => void
}

const WorkflowReportContext = createContext<WorkflowReportContextValue | undefined>(undefined)

type WorkflowReportProviderProps = {
  children: ReactNode
}

export function WorkflowReportProvider({ children }: WorkflowReportProviderProps) {
  const [invoiceBatch, setInvoiceBatch] = useState<InvoiceWorkflowBatch | null>(null)

  const value = useMemo<WorkflowReportContextValue>(
    () => ({
      invoiceBatch,
      setInvoiceBatch,
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


