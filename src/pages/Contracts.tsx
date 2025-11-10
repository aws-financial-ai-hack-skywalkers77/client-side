import { useCallback, useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { toast } from "sonner"

import { ContractList } from "@/components/ContractList"
import { DetailsModal } from "@/components/DetailsModal"
import { getContractById, getContracts } from "@/api"
import type { Contract } from "@/types"
import type { LayoutContextValue } from "@/components/layout/AppLayout"

const PAGE_SIZE = 10

export function Contracts() {
  const { searchTerm } = useOutletContext<LayoutContextValue>()
  const [page, setPage] = useState(1)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsData, setDetailsData] = useState<unknown>(null)
  const [detailsTitle, setDetailsTitle] = useState("Contract Details")

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
      const metadata = await getContractById(contract.contract_id)
      setDetailsTitle(`Contract ${metadata.contract_id}`)
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

