import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { getContractClause } from "@/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ContractClauseGetResponse } from "@/types"

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "success"; data: ContractClauseGetResponse }

export type ContractClauseDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractDbId: number | null
  clauseId: string | null
}

export function ContractClauseDetailDialog({
  open,
  onOpenChange,
  contractDbId,
  clauseId,
}: ContractClauseDetailDialogProps) {
  const [state, setState] = useState<LoadState>({ status: "idle" })

  useEffect(() => {
    if (!open) {
      setState({ status: "idle" })
      return
    }

    if (contractDbId == null || clauseId == null || clauseId.trim() === "") {
      setState({ status: "missing" })
      return
    }

    setState({ status: "loading" })
    let cancelled = false

    void getContractClause(contractDbId, clauseId)
      .then((data) => {
        if (!cancelled) setState({ status: "success", data })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : "Failed to load clause"
        setState({ status: "error", message })
      })

    return () => {
      cancelled = true
    }
  }, [open, contractDbId, clauseId])

  const title =
    state.status === "success"
      ? state.data.clause.section_title?.trim() || `Clause ${state.data.clause.clause_id}`
      : "Contract clause"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden gap-0 p-0">
        <DialogHeader className="space-y-1 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="pr-8 leading-snug">{title}</DialogTitle>
          {state.status === "success" ? (
            <div className="space-y-0.5 text-left text-xs text-muted-foreground">
              <p>
                Contract{" "}
                <span className="font-mono text-foreground">
                  {state.data.contract_id ?? `db:${state.data.contract_db_id}`}
                </span>
              </p>
              {state.data.vendor_name ? <p>Vendor {state.data.vendor_name}</p> : null}
              <p className="font-mono text-foreground/90">Clause id: {state.data.clause.clause_id}</p>
            </div>
          ) : (
            <DialogDescription className="text-left">
              Full clause text from your contract library.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="px-6 py-4">
          {state.status === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading clause…
            </div>
          ) : null}

          {state.status === "missing" ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              A contract database id and clause id are required to load this clause.
            </p>
          ) : null}

          {state.status === "error" ? (
            <p className="py-8 text-center text-sm text-destructive">{state.message}</p>
          ) : null}

          {state.status === "success" ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                {state.data.clause.clause_type ? (
                  <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                    <dt className="font-medium text-muted-foreground">Type</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {state.data.clause.clause_type}
                    </dd>
                  </div>
                ) : null}
                {typeof state.data.clause.page_number === "number" ? (
                  <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                    <dt className="font-medium text-muted-foreground">Page</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {state.data.clause.page_number}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Clause text
                </p>
                <ScrollArea className="max-h-[min(50vh,420px)] rounded-lg border border-border bg-muted/15">
                  <pre className="whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-foreground">
                    {state.data.clause.clause_text?.trim() || "—"}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
