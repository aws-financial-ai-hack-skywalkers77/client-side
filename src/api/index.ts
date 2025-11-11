import type {
  Contract,
  DocumentType,
  HealthResponse,
  Invoice,
  PaginatedContracts,
  PaginatedInvoices,
  UploadResponse,
  InvoiceWorkflowBatch,
  InvoiceWorkflowReport,
} from "@/types"
import { apiClient } from "./client"

const INLINE_RESPONSE_KEYS = ["response", "answer", "analytics", "result", "data", "message"] as const

function extractInlineAnswer(payload: unknown): string {
  if (payload === null || payload === undefined) {
    return "The AI service returned no analytics for this request."
  }

  if (typeof payload === "string") {
    return payload
  }

  if (typeof payload === "object") {
    for (const key of INLINE_RESPONSE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        const value = (payload as Record<string, unknown>)[key]
        if (typeof value === "string") {
          return value
        }
        if (value && typeof value === "object") {
          return JSON.stringify(value, null, 2)
        }
        if (value !== undefined && value !== null) {
          return String(value)
        }
      }
    }

    // If no known keys matched, try to stringify the whole payload
    try {
      return JSON.stringify(payload, null, 2)
    } catch {
      return "The AI response could not be parsed."
    }
  }

  return String(payload)
}

export async function uploadDocument(file: File, type: DocumentType) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("document_type", type)

  const response = await apiClient.post<UploadResponse>(
    "/upload_document",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  )

  return response.data
}

export async function getInvoices(params?: {
  limit?: number
  offset?: number
}): Promise<PaginatedInvoices> {
  const response = await apiClient.get<PaginatedInvoices>("/invoices", {
    params,
  })
  return response.data
}

export async function getInvoiceById(id: number): Promise<Invoice> {
  const response = await apiClient.get<{ success: boolean; metadata: Invoice }>(
    `/invoices/${id}`,
  )
  return response.data.metadata
}

export async function getContracts(params?: {
  limit?: number
  offset?: number
}): Promise<PaginatedContracts> {
  const response = await apiClient.get<PaginatedContracts>("/contracts", {
    params,
  })
  return response.data
}

export async function getContractById(id: number): Promise<Contract> {
  const response = await apiClient.get<{
    success: boolean
    metadata: Contract
  }>(`/contracts/${id}`)
  return response.data.metadata
}

export async function checkHealth() {
  const response = await apiClient.get<HealthResponse>("/health")
  return response.data
}

export async function queryContractAnalytics(id: number, query: string): Promise<string> {
  const response = await apiClient.post("/query_contracts", {
    id,
    query,
  })
  return extractInlineAnswer(response.data)
}

export async function queryInvoiceAnalytics(id: number, query: string): Promise<string> {
  const response = await apiClient.post("/query_invoices", {
    id,
    query,
  })
  return extractInlineAnswer(response.data)
}

function normalizeInvoiceWorkflowPayload(payload: unknown): InvoiceWorkflowBatch {
  const fallback: InvoiceWorkflowBatch = {
    generated_at: new Date().toISOString(),
    invoices: [],
    metadata: {},
  }

  if (!payload) {
    return fallback
  }

  const wrapSingle = (report: InvoiceWorkflowReport): InvoiceWorkflowBatch => ({
    generated_at: report.processed_at ?? new Date().toISOString(),
    invoices: [report],
    metadata: {},
  })

  if (Array.isArray(payload)) {
    const reports = payload
      .map((item) => normalizeInvoiceWorkflowReport(item))
      .filter(Boolean) as InvoiceWorkflowReport[]
    return {
      generated_at: new Date().toISOString(),
      invoices: reports,
      metadata: {},
    }
  }

  if (typeof payload === "object") {
    const reportPayload = payload as Record<string, unknown>

    if (Array.isArray(reportPayload.invoices)) {
      const reports = reportPayload.invoices
        .map((item) => normalizeInvoiceWorkflowReport(item))
        .filter(Boolean) as InvoiceWorkflowReport[]
      const generatedAt =
        (typeof reportPayload.generated_at === "string" && reportPayload.generated_at) ||
        new Date().toISOString()
      return {
        generated_at: generatedAt,
        invoices: reports,
        metadata: reportPayload.metadata && typeof reportPayload.metadata === "object"
          ? (reportPayload.metadata as Record<string, unknown>)
          : {},
      }
    }

    const single = normalizeInvoiceWorkflowReport(reportPayload)
    if (single) {
      return wrapSingle(single)
    }
  }

  return fallback
}

function normalizeInvoiceWorkflowReport(payload: unknown): InvoiceWorkflowReport | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const source = payload as Record<string, unknown>
  const invoiceId =
    typeof source.invoice_id === "string"
      ? source.invoice_id
      : typeof source.id === "string"
        ? source.id
        : source.invoice_id !== undefined
          ? String(source.invoice_id)
          : "Unknown Invoice"

  const violations = Array.isArray(source.violations)
    ? source.violations.filter(Boolean).map((item) => item as Record<string, unknown>)
    : []

  const evaluationSummary =
    source.evaluation_summary && typeof source.evaluation_summary === "object"
      ? (source.evaluation_summary as Record<string, unknown>)
      : null

  const clauses = Array.isArray(source.contract_clauses)
    ? source.contract_clauses.filter(Boolean).map((item) => item as Record<string, unknown>)
    : []

  return {
    invoice_id: invoiceId,
    status: typeof source.status === "string" ? source.status : "processed",
    processed_at: typeof source.processed_at === "string" ? source.processed_at : undefined,
    violations: violations as InvoiceWorkflowReport["violations"],
    evaluation_summary: evaluationSummary as InvoiceWorkflowReport["evaluation_summary"],
    contract_clauses: clauses as InvoiceWorkflowReport["contract_clauses"],
    next_run_scheduled_in_hours:
      typeof source.next_run_scheduled_in_hours === "number"
        ? source.next_run_scheduled_in_hours
        : undefined,
    raw: source,
  }
}

export async function runInvoiceWorkflow(invoiceIds: number[]): Promise<InvoiceWorkflowBatch> {
  const response = await apiClient.post("/workflow/invoices", {
    invoice_ids: invoiceIds,
  })
  return normalizeInvoiceWorkflowPayload(response.data)
}

