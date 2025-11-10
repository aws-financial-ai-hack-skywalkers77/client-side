export type DocumentType = "invoice" | "contract"

export interface Invoice {
  id: number
  invoice_id: string
  seller_name: string
  seller_address: string
  tax_id: string
  subtotal_amount: number
  tax_amount: number
  summary: string
  created_at: string
  updated_at?: string
}

export interface Contract {
  id: number
  contract_id: string
  summary: string
  text: string
  created_at: string
  updated_at?: string
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

