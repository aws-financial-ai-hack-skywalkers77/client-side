import { useCallback } from "react"
import { Download, Copy } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

type DetailsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  data: unknown
}

export function DetailsModal({
  open,
  onOpenChange,
  title,
  description,
  data,
}: DetailsModalProps) {
  const handleCopy = useCallback(async () => {
    if (!data) return
    try {
      const serialized = JSON.stringify(data, null, 2)
      await navigator.clipboard.writeText(serialized)
      toast.success("Metadata copied to clipboard")
    } catch (error) {
      console.error(error)
      toast.error("Unable to copy to clipboard")
    }
  }, [data])

  const handleExport = useCallback(() => {
    if (!data) return
    const serialized = JSON.stringify(data, null, 2)
    const blob = new Blob([serialized], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("JSON exported")
  }, [data, title])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>
        <ScrollArea className="max-h-[60vh] rounded-lg border border-border bg-muted/10 p-4">
          <pre className="whitespace-pre-wrap break-all text-sm leading-relaxed text-muted-foreground">
            {data ? JSON.stringify(data, null, 2) : "No metadata available"}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

