import { useCallback, useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { toast } from "sonner"

import { ContractList } from "@/components/ContractList"
import { DetailsModal } from "@/components/DetailsModal"
import { getContractById, getContracts } from "@/api"
import type { Contract } from "@/types"
import type { LayoutContextValue } from "@/components/layout/AppLayout"
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "@/lib/storage"

const PAGE_SIZE = 10

type ContractsPageState = {
  contracts: Contract[]
  total: number
  page: number
}

export function Contracts() {
  const { searchTerm } = useOutletContext<LayoutContextValue>()
  
  // Load persisted state from localStorage
  const persistedState = loadFromStorage<ContractsPageState>(STORAGE_KEYS.CONTRACTS)
  
  const [page, setPage] = useState(persistedState?.page ?? 1)
  const [contracts, setContracts] = useState<Contract[]>(persistedState?.contracts ?? [])
  const [total, setTotal] = useState(persistedState?.total ?? 0)
  const [loading, setLoading] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsData, setDetailsData] = useState<unknown>(null)
  const [detailsTitle, setDetailsTitle] = useState("Contract Details")

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    saveToStorage<ContractsPageState>(STORAGE_KEYS.CONTRACTS, {
      contracts,
      total,
      page,
    })
  }, [contracts, total, page])

  const fetchContracts = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getContracts({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
      setContracts(response.contracts)
      setTotal(response.total)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load contracts")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  const handleViewDetails = useCallback(async (contract: Contract) => {
    try {
      const metadata = await getContractById(contract.id)
      setDetailsTitle(`Contract ${metadata.contract_id ?? "Unknown"}`)
      setDetailsData(metadata)
      setDetailsOpen(true)
    } catch (error) {
      console.error(error)
      toast.error("Unable to load contract details")
    }
  }, [])

  return (
    <>
      <ContractList
        contracts={contracts}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onViewDetails={handleViewDetails}
        searchTerm={searchTerm}
        onRowClick={handleViewDetails}
      />

      <DetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title={detailsTitle}
        data={detailsData}
        description="Full metadata extracted from the contract document."
      />
    </>
  )
}

