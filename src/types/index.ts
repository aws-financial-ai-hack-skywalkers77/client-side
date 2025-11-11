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

export interface InvoiceWorkflowViolation {
  line_id?: string | null
  violation_type: string
  expected_price?: number | null
  actual_price?: number | null
  difference?: number | null
  contract_clause_reference?: string | null
  applied_rule?: InvoiceWorkflowRule | null
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
  status: string
  processed_at?: string
  violations?: InvoiceWorkflowViolation[]
  evaluation_summary?: InvoiceWorkflowEvaluationSummary | null
  contract_clauses?: InvoiceWorkflowContractClause[]
  next_run_scheduled_in_hours?: number | null
  raw?: Record<string, unknown>
  [key: string]: unknown
}

export interface InvoiceWorkflowBatch {
  generated_at: string
  invoices: InvoiceWorkflowReport[]
  metadata?: Record<string, unknown>
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

