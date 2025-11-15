export type DocumentType = "invoice" | "contract"

export interface Invoice {
  id: number
  invoice_id: string | null
  seller_name: string | null
  seller_address: string | null
  tax_id: string | null
  subtotal_amount: number | null
  tax_amount: number | null
  summary: string | null
  risk_percentage?: number | null
  created_at: string
  updated_at?: string | null
}

export interface Contract {
  id: number
  contract_id: string | null
  summary: string | null
  text: string | null
  created_at: string
  updated_at?: string | null
}

export interface InvoiceWorkflowRule {
  unit_price?: number | null
  tolerance_percent?: number | null
  clause_reference?: string | null
  [key: string]: unknown
}

export interface PdfLocation {
  page?: number
  page_number?: number // Alias for page
  left?: number
  top?: number
  right?: number
  bottom?: number
  bbox?: {
    left: number
    top: number
    right: number
    bottom: number
  }
  normalized?: boolean
  coordinate_system?: string
}

export interface ViolationReasoning {
  explanation?: string
  expected_value?: string
  actual_value?: string
  contract_requirement?: string
  [key: string]: unknown
}

export interface ClauseReference {
  contract_id?: string
  vendor_name?: string
  similarity?: number
  service_types?: string[]
  context_source?: string
  [key: string]: unknown
}

export interface InvoiceWorkflowViolation {
  line_id?: string | null
  violation_type: string
  expected_price?: number | null
  actual_price?: number | null
  difference?: number | null
  clause_reference?: string | ClauseReference | null
  contract_clause_reference?: string | null // Keep for backward compatibility
  applied_rule?: InvoiceWorkflowRule | null
  reasoning?: ViolationReasoning | null
  pdf_location?: PdfLocation | null
  [key: string]: unknown
}

export interface InvoiceWorkflowEvaluationSummary {
  line_items_evaluated?: number | null
  rules_evaluated?: number | null
  violations_detected?: number | null
  [key: string]: unknown
}

export interface InvoiceWorkflowContractClause {
  contract_id: string
  similarity?: number | null
  [key: string]: unknown
}

export interface InvoiceWorkflowReport {
  invoice_id: string
  invoice_db_id?: number // Database ID to distinguish duplicates
  status: string
  processed_at?: string
  violations?: InvoiceWorkflowViolation[]
  evaluation_summary?: InvoiceWorkflowEvaluationSummary | null
  contract_clauses?: InvoiceWorkflowContractClause[]
  next_run_scheduled_in_hours?: number | null
  risk_assessment_score?: number | null
  risk_percentage?: number | null // Computed from risk_assessment_score * 100
  raw?: Record<string, unknown>
  [key: string]: unknown
}

export interface InvoiceWorkflowBatch {
  generated_at: string
  invoices: InvoiceWorkflowReport[]
  metadata?: Record<string, unknown>
  processed?: number
  failed?: number
  errors?: Array<{
    invoice_db_id: number
    invoice_id: string
    error: string
  }>
  invoices_in_queue?: number
  violations_detected?: number
  next_run_scheduled_in_hours?: number
}

export interface UploadResponse<T = Invoice | Contract> {
  success: boolean
  message: string
  metadata: T
}

export interface PaginatedInvoices {
  success: boolean
  count: number
  total: number
  limit: number
  offset: number
  invoices: Invoice[]
}

export interface PaginatedContracts {
  success: boolean
  count: number
  total: number
  limit: number
  offset: number
  contracts: Contract[]
}

export interface HealthResponse {
  status: string
}

export interface DownloadUrlResponse {
  success: boolean
  document_type: "invoice" | "contract"
  db_id: number
  s3_key: string
  presigned_url: string
  expires_in_seconds: number
  expires_in_hours: number
}

