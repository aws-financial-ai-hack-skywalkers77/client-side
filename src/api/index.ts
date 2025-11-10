import type {
  Contract,
  DocumentType,
  HealthResponse,
  Invoice,
  PaginatedContracts,
  PaginatedInvoices,
  UploadResponse,
} from "@/types"
import { apiClient } from "./client"

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

export async function getInvoiceById(invoiceId: string): Promise<Invoice> {
  const response = await apiClient.get<{ success: boolean; metadata: Invoice }>(
    `/invoices/${invoiceId}`,
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

export async function getContractById(contractId: string): Promise<Contract> {
  const response = await apiClient.get<{
    success: boolean
    metadata: Contract
  }>(`/contracts/${contractId}`)
  return response.data.metadata
}

export async function checkHealth() {
  const response = await apiClient.get<HealthResponse>("/health")
  return response.data
}

