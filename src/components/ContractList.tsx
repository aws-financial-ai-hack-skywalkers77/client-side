import { useMemo, useState } from "react"
import { FileText, FileText as TextIcon, AlignLeft, Calendar, AlertCircle, Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import type { Contract } from "@/types"
import { InlineQueryCell, InlineQueryOverlay } from "@/components/InlineQueryCell"
import { queryContractAnalytics } from "@/api"

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

// Check if value is null or empty
const isEmpty = (value: string | null | undefined): boolean => {
  if (value === null || value === undefined) return true
  if (typeof value === "string" && value.trim() === "") return true
  return false
}

// Format date
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return ""
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateString
  }
}

// Truncate text with ellipsis
const truncate = (text: string | null | undefined, maxLength: number): string => {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

const getContractLabel = (contract: Contract): string => {
  const base =
    contract.contract_id?.trim() && contract.contract_id.trim().length > 0
      ? contract.contract_id.trim()
      : `Contract #${contract.id}`
  return truncate(base, 22)
}

// Not Available component
const NotAvailable = () => (
  <div className="flex items-center gap-1.5 text-sm text-orange-600 dark:text-orange-400">
    <AlertCircle className="h-4 w-4 flex-shrink-0" />
    <span className="whitespace-nowrap">Not available</span>
  </div>
)

export function ContractList({
  contracts,
  loading = false,
  total,
  page,
  pageSize,
  onPageChange,
  onViewDetails: _onViewDetails,
  searchTerm = "",
  onRowClick,
}: ContractListProps) {
  const filteredContracts = useMemo(() => {
    if (!searchTerm) return contracts
    const term = searchTerm.toLowerCase()
    return contracts.filter((contract) =>
      [
        contract.contract_id,
        contract.summary,
        contract.text,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term)),
    )
  }, [contracts, searchTerm])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const [activeQuery, setActiveQuery] = useState<{ id: number; anchor: DOMRect } | null>(null)

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-1">Contracts</h1>
        <p className="text-sm text-muted-foreground">
          {filteredContracts.length} of {total} records
        </p>
      </div>

      <Card className="border-border shadow-sm bg-card">
        <CardContent className="p-0">
          <div className="relative overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground bg-transparent">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Contract ID</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground bg-transparent">
                    <div className="flex items-center gap-2">
                      <TextIcon className="h-4 w-4" />
                      <span>Text</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground bg-transparent">
                    <div className="flex items-center gap-2">
                      <AlignLeft className="h-4 w-4" />
                      <span>Summary</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground bg-transparent">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Updated</span>
                    </div>
                  </th>
                  <th className="w-32 px-6 py-4 text-right text-sm font-medium text-muted-foreground bg-transparent">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading contracts...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredContracts.length > 0 ? (
                  filteredContracts.map((contract) => (
                    <tr
                      key={contract.id}
                      className="relative cursor-pointer transition-colors hover:bg-secondary/20 border-b border-border/30 last:border-b-0"
                      onClick={() => onRowClick?.(contract)}
                    >
                      {/* Contract ID Column */}
                      <td className="px-6 py-4">
                        {isEmpty(contract.contract_id) ? (
                          <NotAvailable />
                        ) : (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground">
                              {contract.contract_id}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Text Column */}
                      <td className="px-6 py-4">
                        {isEmpty(contract.text) ? (
                          <NotAvailable />
                        ) : (
                          <span className="text-sm text-foreground">
                            {truncate(contract.text, 80)}
                          </span>
                        )}
                      </td>

                      {/* Summary Column */}
                      <td className="px-6 py-4">
                        {isEmpty(contract.summary) ? (
                          <NotAvailable />
                        ) : (
                          <span className="text-sm text-foreground">
                            {truncate(contract.summary, 60)}
                          </span>
                        )}
                      </td>

                      {/* Updated Column */}
                      <td className="px-6 py-4">
                        {isEmpty(contract.updated_at) ? (
                          <NotAvailable />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {formatDate(contract.updated_at)}
                          </span>
                        )}
                      </td>

                      {/* Action Column */}
                      <td className="relative px-6 py-4 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="group gap-3 rounded-full border-primary/40 bg-primary/5 px-3 py-2 text-left text-primary shadow-sm transition hover:border-primary/50 hover:bg-primary/10 hover:text-neutral-700"
                          onClick={(event) => {
                            event.stopPropagation()
                            const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect()
                            setActiveQuery((current) =>
                              current?.id === contract.id ? null : { id: contract.id, anchor: rect },
                            )
                          }}
                          disabled={loading}
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary/20">
                            <Sparkles className="h-3.5 w-3.5" />
                          </span>
                          <span className="flex flex-col items-start leading-tight">
                            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80 transition-colors group-hover:text-neutral-700">
                              DocuFlow AI
                            </span>
                            <span className="text-xs font-medium transition-colors group-hover:text-neutral-700">
                              Ask about {getContractLabel(contract)}
                            </span>
                          </span>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No contracts found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {activeQuery ? (
        <InlineQueryOverlay
          anchor={{
            top: activeQuery.anchor.top,
            bottom: activeQuery.anchor.bottom,
            left: activeQuery.anchor.left,
            width: activeQuery.anchor.width,
          }}
          onDismiss={() => setActiveQuery(null)}
        >
          <InlineQueryCell
            title="Contract Analytics"
            description="Ask a question about this contract to surface AI-driven insights."
            placeholder="Ask about this contract..."
            onDismiss={() => setActiveQuery(null)}
            onSubmit={async (prompt) => {
              const response = await queryContractAnalytics(activeQuery.id, prompt)
              return response
            }}
          />
        </InlineQueryOverlay>
      ) : null}

      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
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
    </div>
  )
}
