import { useState } from "react"
import { toast } from "sonner"
import { ClipboardCopy, Info } from "lucide-react"

import { UploadForm } from "@/components/UploadForm"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { UploadResponse } from "@/types"

export function Upload() {
  const [lastUpload, setLastUpload] = useState<UploadResponse | null>(null)

  const handleUploadSuccess = (payload: UploadResponse) => {
    setLastUpload(payload)
  }

  const copyMetadata = async () => {
    if (!lastUpload) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(lastUpload.metadata, null, 2))
      toast.success("Copied metadata to clipboard")
    } catch (error) {
      console.error(error)
      toast.error("Unable to copy metadata")
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
      <UploadForm onUploadSuccess={handleUploadSuccess} />

      <div className="space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="px-6 pt-6">
            <CardTitle>Workflow guidance</CardTitle>
            <CardDescription>
              Each upload triggers the FastAPI pipeline for ADE extraction, Gemini embeddings,
              and PostgreSQL persistence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6 text-sm text-muted-foreground">
            <div className="flex items-start gap-4 rounded-lg border border-dashed border-border/70 bg-secondary/30 p-5">
              <Info className="mt-1 h-4 w-4 text-[#FF9900] dark:text-[#FFB84D]" />
              <div>
                <p className="font-medium text-foreground">Before uploading</p>
                <p>
                  Confirm the PDF is machine-readable and contains the expected invoice or contract
                  identifiers to maximize extraction accuracy.
                </p>
              </div>
            </div>
            <ul className="list-disc space-y-2 pl-5">
              <li>Invoices: summarise seller, tax, and balance data fields.</li>
              <li>Contracts: stores summary and full text for semantic search.</li>
              <li>All uploads include timestamps for audit trails.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-6">
            <div>
              <CardTitle>Latest upload</CardTitle>
              <CardDescription>
                Review the metadata returned from the previous document.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={copyMetadata} disabled={!lastUpload}>
              <ClipboardCopy className="mr-2 h-4 w-4" />
              Copy JSON
            </Button>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {lastUpload ? (
              <pre className="max-h-80 overflow-auto rounded-lg border border-muted bg-muted/20 p-5 text-xs text-muted-foreground">
                {JSON.stringify(lastUpload.metadata, null, 2)}
              </pre>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Upload a document to preview its extracted fields here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

