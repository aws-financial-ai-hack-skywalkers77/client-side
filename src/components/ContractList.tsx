import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Contract } from "@/types"

type ContractListProps = {
  contracts: Contract[]
  loading?: boolean
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onViewDetails: (contract: Contract) => void
  searchTerm?: string
  onRowClick?: (contract: Contract) => void
}

export function ContractList({
  contracts,
  loading = false,
  total,
  page,
  pageSize,
  onPageChange,
  onViewDetails,
  searchTerm = "",
  onRowClick,
}: ContractListProps) {
  const filteredContracts = useMemo(() => {
    if (!searchTerm) return contracts
    const term = searchTerm.toLowerCase()
    return contracts.filter((contract) =>
      [contract.contract_id, contract.summary, contract.text]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term)),
    )
  }, [contracts, searchTerm])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold">Contract Repository</CardTitle>
          <p className="text-sm text-muted-foreground">
            Full-text contract records for deeper clause analysis.
          </p>
        </div>
        <Badge variant="secondary">
          {filteredContracts.length} of {total} records
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Contract ID</th>
                <th className="px-4 py-2 text-left font-semibold">Summary</th>
                <th className="px-4 py-2 text-left font-semibold">Created</th>
                <th className="px-4 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Loading contracts...
                  </td>
                </tr>
              ) : filteredContracts.length > 0 ? (
                filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="cursor-pointer bg-card transition hover:bg-secondary/30"
                    onClick={() => onRowClick?.(contract)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {contract.contract_id}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {contract.summary || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(contract.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation()
                          onViewDetails(contract)
                        }}
                      >
                        View details
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No contracts found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

