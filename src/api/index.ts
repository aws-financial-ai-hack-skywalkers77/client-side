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
  DownloadUrlResponse,
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

  if (typeof payload === "object") {
    const batchPayload = payload as Record<string, unknown>

    // Handle new bulk response format
    if (Array.isArray(batchPayload.reports)) {
      const reports = batchPayload.reports
        .map((item) => normalizeInvoiceWorkflowReport(item))
        .filter(Boolean) as InvoiceWorkflowReport[]
      
      // Extract metadata from the batch response
      const errors = Array.isArray(batchPayload.errors) 
        ? batchPayload.errors as Array<{ invoice_db_id: number; invoice_id: string; error: string }>
        : undefined

      return {
        generated_at: new Date().toISOString(),
        invoices: reports,
        processed: typeof batchPayload.processed === "number" ? batchPayload.processed : undefined,
        failed: typeof batchPayload.failed === "number" ? batchPayload.failed : undefined,
        errors,
        invoices_in_queue: typeof batchPayload.invoices_in_queue === "number" ? batchPayload.invoices_in_queue : undefined,
        violations_detected: typeof batchPayload.violations_detected === "number" ? batchPayload.violations_detected : undefined,
        next_run_scheduled_in_hours: typeof batchPayload.next_run_scheduled_in_hours === "number" ? batchPayload.next_run_scheduled_in_hours : undefined,
        metadata: {
          status: batchPayload.status,
        },
      }
    }

    // Fallback: handle old format with 'invoices' array
    if (Array.isArray(batchPayload.invoices)) {
      const reports = batchPayload.invoices
        .map((item) => normalizeInvoiceWorkflowReport(item))
        .filter(Boolean) as InvoiceWorkflowReport[]
      const generatedAt =
        (typeof batchPayload.generated_at === "string" && batchPayload.generated_at) ||
        new Date().toISOString()
      return {
        generated_at: generatedAt,
        invoices: reports,
        metadata: batchPayload.metadata && typeof batchPayload.metadata === "object"
          ? (batchPayload.metadata as Record<string, unknown>)
          : {},
      }
    }

    // Fallback: handle single report
    if (typeof batchPayload.invoice_id === "string") {
      const single = normalizeInvoiceWorkflowReport(batchPayload)
      if (single) {
        return {
          generated_at: single.processed_at ?? new Date().toISOString(),
          invoices: [single],
          metadata: {},
        }
      }
    }
  }

  // Handle array of reports (old format)
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

  // Extract risk_assessment_score and convert to percentage (multiply by 100)
  let riskPercentage: number | null | undefined = undefined
  if (typeof source.risk_assessment_score === "number") {
    // Multiply by 100 to convert to percentage
    riskPercentage = Math.round(source.risk_assessment_score * 100 * 100) / 100 // Round to 2 decimal places
  } else if (source.risk_assessment_score === null) {
    riskPercentage = null
  } else if (typeof source.risk_percentage === "number") {
    // Fallback to risk_percentage if risk_assessment_score not provided
    riskPercentage = source.risk_percentage
  } else if (source.risk_percentage === null) {
    riskPercentage = null
  } else if (evaluationSummary) {
    // Calculate risk based on violations detected vs items evaluated as last resort
    const itemsEvaluated = typeof evaluationSummary.line_items_evaluated === "number" ? evaluationSummary.line_items_evaluated : 0
    const violationsDetected = typeof evaluationSummary.violations_detected === "number" ? evaluationSummary.violations_detected : violations.length
    if (itemsEvaluated > 0) {
      riskPercentage = Math.round((violationsDetected / itemsEvaluated) * 100)
    } else if (violationsDetected > 0) {
      riskPercentage = 100
    } else {
      riskPercentage = 0
    }
  }

  // Extract invoice_db_id from raw or metadata
  const invoiceDbId = typeof source.invoice_db_id === "number" 
    ? source.invoice_db_id 
    : typeof source.db_id === "number"
      ? source.db_id
      : undefined

  return {
    invoice_id: invoiceId,
    invoice_db_id: invoiceDbId,
    status: typeof source.status === "string" ? source.status : "processed",
    processed_at: typeof source.processed_at === "string" ? source.processed_at : undefined,
    violations: violations as InvoiceWorkflowReport["violations"],
    evaluation_summary: evaluationSummary as InvoiceWorkflowReport["evaluation_summary"],
    contract_clauses: clauses as InvoiceWorkflowReport["contract_clauses"],
    next_run_scheduled_in_hours:
      typeof source.next_run_scheduled_in_hours === "number"
        ? source.next_run_scheduled_in_hours
        : undefined,
    risk_assessment_score: typeof source.risk_assessment_score === "number" ? source.risk_assessment_score : undefined,
    risk_percentage: riskPercentage,
    raw: source,
  }
}

export async function runInvoiceWorkflow(invoiceIds: number[]): Promise<InvoiceWorkflowBatch> {
  const response = await apiClient.post("/analyze_invoices", {
    invoice_ids: invoiceIds,
  })
  return normalizeInvoiceWorkflowPayload(response.data)
}

/**
 * Fetches a presigned S3 URL for an invoice PDF
 * @param dbId The database ID of the invoice
 * @returns Promise resolving to the download URL response containing the presigned URL
 */
export async function getInvoiceDownloadUrl(dbId: number): Promise<DownloadUrlResponse> {
  const endpoint = `/documents/invoice/${dbId}/download_url`
  console.log("Calling invoice download URL endpoint:", endpoint)
  const response = await apiClient.get<DownloadUrlResponse>(endpoint)
  return response.data
}

/**
 * Fetches a presigned S3 URL for a contract PDF
 * @param dbId The database ID of the contract
 * @returns Promise resolving to the download URL response containing the presigned URL
 */
export async function getContractDownloadUrl(dbId: number): Promise<DownloadUrlResponse> {
  const endpoint = `/documents/contract/${dbId}/download_url`
  console.log("Calling contract download URL endpoint:", endpoint)
  const response = await apiClient.get<DownloadUrlResponse>(endpoint)
  return response.data
}

