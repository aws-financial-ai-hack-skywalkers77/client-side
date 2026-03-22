import type {
  Contract,
  ComplianceReportLatest,
  ContractQueryResponse,
  DocumentType,
  DownloadUrlResponse,
  HealthResponse,
  Invoice,
  InvoicePdfUrlResponse,
  InvoiceWorkflowBatch,
  InvoiceWorkflowReport,
  PaginatedContracts,
  PaginatedInvoices,
  UploadResponse,
} from "@/types"
import { apiClient, API_BASE_URL } from "./client"

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

function parseContractQueryResponse(data: unknown): ContractQueryResponse {
  if (data === null || data === undefined) {
    return { answer: "The AI service returned no response for this request." }
  }
  if (typeof data === "string") {
    return { answer: data }
  }
  if (typeof data !== "object") {
    return { answer: String(data) }
  }
  const o = data as Record<string, unknown>
  const answer =
    typeof o.answer === "string"
      ? o.answer
      : extractInlineAnswer(data)
  const disclaimer = typeof o.disclaimer === "string" ? o.disclaimer : undefined
  const sources = Array.isArray(o.sources) ? o.sources : undefined
  return { answer, disclaimer, sources }
}

export async function queryContractAnalytics(id: number, query: string): Promise<ContractQueryResponse> {
  const response = await apiClient.post("/query_contracts", {
    id,
    query,
  })
  return parseContractQueryResponse(response.data)
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
    riskPercentage = source.risk_percentage
  } else if (source.risk_percentage === null) {
    riskPercentage = null
  }

  const riskTier =
    typeof source.risk_tier === "string"
      ? source.risk_tier
      : source.risk_tier === null
        ? null
        : undefined

  // Extract invoice_db_id from raw or metadata
  const invoiceDbId = typeof source.invoice_db_id === "number" 
    ? source.invoice_db_id 
    : typeof source.db_id === "number"
      ? source.db_id
      : undefined

  const reviewStatus =
    typeof source.review_status === "string"
      ? source.review_status
      : undefined

  const escalations = Array.isArray(source.escalations)
    ? (source.escalations as InvoiceWorkflowReport["escalations"])
    : undefined

  const lineEvaluations = Array.isArray(source.line_evaluations)
    ? (source.line_evaluations as InvoiceWorkflowReport["line_evaluations"])
    : undefined

  const auditTrace =
    source.audit_trace && typeof source.audit_trace === "object"
      ? (source.audit_trace as Record<string, unknown>)
      : undefined

  const pricingRules =
    source.pricing_rules && typeof source.pricing_rules === "object"
      ? (source.pricing_rules as InvoiceWorkflowReport["pricing_rules"])
      : undefined

  const s3Url =
    typeof source.s3_url === "string"
      ? source.s3_url
      : source.s3_url === null
        ? null
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
    risk_assessment_score:
      typeof source.risk_assessment_score === "number"
        ? source.risk_assessment_score
        : source.risk_assessment_score === null
          ? null
          : undefined,
    risk_percentage: riskPercentage,
    risk_tier: riskTier,
    s3_url: s3Url,
    review_status: reviewStatus,
    escalations,
    line_evaluations: lineEvaluations,
    audit_trace: auditTrace,
    pricing_rules: pricingRules,
    raw: source,
  }
}

export async function runInvoiceWorkflow(invoiceIds: number[]): Promise<InvoiceWorkflowBatch> {
  const response = await apiClient.post("/analyze_invoices", {
    invoice_ids: invoiceIds,
  })
  return normalizeInvoiceWorkflowPayload(response.data)
}

/** Accept common API shapes for a single PDF URL string. */
function parsePdfUrlPayload(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const o = data as Record<string, unknown>
  const keys = ["url", "presigned_url", "download_url", "pdf_url"] as const
  for (const key of keys) {
    const v = o[key]
    if (typeof v === "string" && v.length > 0) return v
  }
  return null
}

function isUsableDbId(id: unknown): id is number {
  return typeof id === "number" && Number.isFinite(id) && id >= 0
}

/**
 * Ask the API for the highlighted PDF (`{invoice_id}_highlighted.pdf` in S3) when supported.
 * Set `VITE_PDF_USE_HIGHLIGHTED=false` to request the original file only.
 */
function preferHighlightedPdf(): boolean {
  return import.meta.env.VITE_PDF_USE_HIGHLIGHTED !== "false"
}

function pdfUrlQueryParams(): Record<string, string> | undefined {
  if (!preferHighlightedPdf()) return undefined
  return { highlighted: "true" }
}

function directPdfQuerySuffix(): string {
  if (!preferHighlightedPdf()) return ""
  return "?highlighted=true"
}

/**
 * GET {API_BASE}/invoices/{invoiceDbId}/pdf_url — read `url` from JSON body.
 */
export async function getInvoicePdfUrl(invoiceDbId: number): Promise<string> {
  const response = await apiClient.get<InvoicePdfUrlResponse & Record<string, unknown>>(
    `/invoices/${invoiceDbId}/pdf_url`,
    { params: pdfUrlQueryParams() },
  )
  const url = parsePdfUrlPayload(response.data)
  if (url) return url
  throw new Error("Invalid pdf_url response: missing url")
}

/**
 * GET {API_BASE}/invoices/by-invoice-id/{invoiceId}/pdf_url (invoiceId URL-encoded).
 */
export async function getInvoicePdfUrlByBusinessInvoiceId(invoiceBusinessId: string): Promise<string> {
  const enc = encodeURIComponent(invoiceBusinessId)
  const response = await apiClient.get<InvoicePdfUrlResponse & Record<string, unknown>>(
    `/invoices/by-invoice-id/${enc}/pdf_url`,
    { params: pdfUrlQueryParams() },
  )
  const url = parsePdfUrlPayload(response.data)
  if (url) return url
  throw new Error("Invalid pdf_url response: missing url")
}

const apiOrigin = () => API_BASE_URL.replace(/\/$/, "")

export type OpenInvoicePdfArgs = {
  /** From GET /invoices → `id` (database primary key). */
  invoiceDbId?: number
  /** Business invoice id, e.g. INV-2024-OM-004 — used when db id is unavailable. */
  invoiceBusinessId?: string | null
}

/**
 * Resolves PDF via FastAPI only (never the SPA).
 * 1) GET .../pdf_url (JSON with url or presigned_url, etc.)
 * 2) On failure (CORS, 404, wrong shape): open direct PDF route in a new tab (no XHR — avoids CORS).
 */
export async function openInvoicePdfInNewTab(args: OpenInvoicePdfArgs): Promise<void> {
  const { invoiceDbId, invoiceBusinessId } = args
  const business = invoiceBusinessId?.trim() ?? ""
  const hasDb = isUsableDbId(invoiceDbId)
  const hasBusiness = business.length > 0

  if (!hasDb && !hasBusiness) {
    throw new Error("Need invoice database id or business invoice_id to open PDF")
  }

  if (hasDb) {
    try {
      const url = await getInvoicePdfUrl(invoiceDbId)
      window.open(url, "_blank", "noopener,noreferrer")
      return
    } catch {
      window.open(
        `${apiOrigin()}/invoices/${invoiceDbId}/pdf${directPdfQuerySuffix()}`,
        "_blank",
        "noopener,noreferrer",
      )
      return
    }
  }

  try {
    const url = await getInvoicePdfUrlByBusinessInvoiceId(business)
    window.open(url, "_blank", "noopener,noreferrer")
  } catch {
    const enc = encodeURIComponent(business)
    window.open(
      `${apiOrigin()}/invoices/by-invoice-id/${enc}/pdf${directPdfQuerySuffix()}`,
      "_blank",
      "noopener,noreferrer",
    )
  }
}

/** PDF link from saved compliance report — prefer highlighted when API includes it. */
export function complianceReportPdfUrl(report: ComplianceReportLatest | null | undefined): string | null {
  if (!report || typeof report !== "object") return null
  const r = report as Record<string, unknown>
  if (preferHighlightedPdf()) {
    if (typeof r.highlighted_pdf_url === "string" && r.highlighted_pdf_url.length > 0) {
      return r.highlighted_pdf_url
    }
    const llm = r.llm_metadata
    if (llm && typeof llm === "object") {
      const lm = llm as Record<string, unknown>
      if (typeof lm.highlighted_s3_url === "string" && lm.highlighted_s3_url.length > 0) {
        return lm.highlighted_s3_url
      }
    }
  }
  if (typeof report.pdf_url === "string" && report.pdf_url.length > 0) return report.pdf_url
  const llm = report.llm_metadata
  if (llm && typeof llm === "object" && typeof llm.s3_url === "string" && llm.s3_url.length > 0) {
    return llm.s3_url
  }
  return null
}

/** GET /invoices/{invoiceDbId}/compliance_report/latest */
export async function getComplianceReportLatest(
  invoiceDbId: number,
): Promise<ComplianceReportLatest> {
  const response = await apiClient.get<ComplianceReportLatest>(
    `/invoices/${invoiceDbId}/compliance_report/latest`,
  )
  return response.data
}

/**
 * Fetches a presigned S3 URL for an invoice PDF (legacy documents path).
 */
export async function getInvoiceDownloadUrl(dbId: number): Promise<DownloadUrlResponse> {
  const endpoint = `/documents/invoice/${dbId}/download_url`
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

