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

