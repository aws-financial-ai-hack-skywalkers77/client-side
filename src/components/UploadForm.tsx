import { type FormEvent, useEffect, useRef, useState } from "react"
import { FileUp, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { uploadDocument } from "@/api"
import type { DocumentType, UploadResponse } from "@/types"

const MAX_FILE_SIZE = 10 * 1024 * 1024

type UploadFormProps = {
  onUploadSuccess?: (payload: UploadResponse) => void
}

export function UploadForm({ onUploadSuccess }: UploadFormProps) {
  const [documentType, setDocumentType] = useState<DocumentType>("invoice")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!uploading) {
      setProgress(0)
      if (progressTimer.current !== null) {
        window.clearInterval(progressTimer.current)
        progressTimer.current = null
      }
      return
    }

    progressTimer.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 500)

    return () => {
      if (progressTimer.current !== null) {
        window.clearInterval(progressTimer.current)
        progressTimer.current = null
      }
    }
  }, [uploading])

  const resetForm = () => {
    setFile(null)
    setProgress(0)
    const input = document.getElementById("file-upload") as HTMLInputElement | null
    if (input) input.value = ""
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      toast.warning("Please select a PDF file to upload")
      return
    }

    if (file.type !== "application/pdf") {
      toast.error("Only PDF documents are supported")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be 10 MB or smaller")
      return
    }

    setUploading(true)
    try {
      const response = await uploadDocument(file, documentType)
      setProgress(100)
      toast.success("Document processed successfully")
      onUploadSuccess?.(response)
      resetForm()
    } catch (error) {
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <FileUp className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Upload new document</h2>
          <p className="text-sm text-muted-foreground">
            Supported types: PDF invoices or contracts up to 10 MB.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="document-type">Document type</Label>
          <Select
            value={documentType}
            onValueChange={(value) => setDocumentType(value as DocumentType)}
          >
            <SelectTrigger id="document-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file-upload">PDF document</Label>
          <Input
            id="file-upload"
            type="file"
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={uploading}
          />
          {file ? (
            <p className="text-xs text-muted-foreground">
              Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Choose a PDF exported from your accounting suite or contract workspace.
            </p>
          )}
        </div>
      </div>

      {uploading ? (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">
            Uploading and processing document with Landing AI ADE...
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={resetForm}
          disabled={uploading}
        >
          Reset
        </Button>
        <Button type="submit" disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Upload document"
          )}
        </Button>
      </div>
    </form>
  )
}

