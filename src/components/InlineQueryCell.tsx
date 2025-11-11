import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Loader2, Sparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type AnchorPosition = {
  top: number
  left: number
  width: number
  bottom: number
}

type InlineQueryCellProps = {
  placeholder: string
  onSubmit: (query: string) => Promise<string>
  disabled?: boolean
  onDismiss?: () => void
  title?: string
  description?: string
}

type InlineQueryOverlayProps = {
  anchor: AnchorPosition
  onDismiss: () => void
  width?: number
  children: ReactNode
}

type ConversationTurn = {
  id: string
  query: string
  answer: string
}

function normalizeLineBreaks(text: string): string {
  return text.replace(/\\r\\n|\\n|\\r|\/r|\/n/g, "\n").replace(/\r\n|\r|\n/g, "\n")
}

function emphasizeDurations(text: string): string {
  return text.replace(/(?<!\*)five\s*\(5\)\s*years(?!\*)/gi, (match) => `**${match}**`)
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function formatAnswer(answer: string): { __html: string } {
  const normalized = normalizeLineBreaks(answer)
  const emphasized = emphasizeDurations(normalized)
  const lines = emphasized.split("\n")

  const html = lines
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) {
        return '<div class="h-2"></div>'
      }

      let tag: "p" | "h3" | "h4" = "p"
      let classes = "text-xs text-muted-foreground leading-relaxed"
      let content = trimmed

      if (/^###\s+/.test(trimmed)) {
        tag = "h3"
        classes = "text-sm font-semibold text-foreground"
        content = trimmed.replace(/^###\s+/, "")
      } else if (/^####\s*(-\s*)?/.test(trimmed)) {
        tag = "h4"
        classes = "text-xs font-semibold text-foreground"
        content = trimmed.replace(/^####\s*(-\s*)?/, "")
      }

      const escaped = escapeHtml(content)
      const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")

      return `<${tag} class="${classes}">${withBold}</${tag}>`
    })
    .join("")

  return { __html: html }
}

export function InlineQueryCell({
  placeholder,
  onSubmit,
  disabled = false,
  onDismiss,
  title = "Ask the AI Assistant",
  description = "Ask a contextual question and receive inline analytics.",
}: InlineQueryCellProps) {
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus()
    }
  }, [disabled])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const prompt = input.trim()
    if (!prompt || disabled) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const analytics = await onSubmit(prompt)
      setHistory((previous) => [
        ...previous,
        {
          id: `${Date.now()}-${previous.length}`,
          query: prompt,
          answer: analytics,
        },
      ])
      setInput("")
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to retrieve analytics for this record."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {onDismiss ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation()
              onDismiss()
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        ) : null}
      </div>

      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Start a conversation to see contextual insights for this record.
          </p>
        ) : (
          history.map((turn) => (
            <div key={turn.id} className="space-y-1 text-xs">
              <div className="rounded-md border border-border bg-background px-2 py-1 text-foreground">
                <p className="font-medium text-foreground">You</p>
                <p className="text-muted-foreground">{turn.query}</p>
              </div>
              <div className="rounded-md border border-primary/40 bg-primary/5 px-2 py-1 text-foreground">
                <p className="font-medium text-primary">AI</p>
                <div
                  className="space-y-1"
                  dangerouslySetInnerHTML={formatAnswer(turn.answer)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder}
          disabled={disabled || loading}
          className="h-9 text-sm"
        />
        <Button
          type="submit"
          size="sm"
          className="gap-1.5"
          disabled={disabled || loading || !input.trim()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          <span>{loading ? "Thinking" : "Ask"}</span>
        </Button>
      </form>
    </div>
  )
}

export function InlineQueryOverlay({ anchor, onDismiss, width = 360, children }: InlineQueryOverlayProps) {
  if (typeof document === "undefined") {
    return null
  }

  useEffect(() => {
    if (!onDismiss) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onDismiss])

  const top = anchor.bottom + window.scrollY + 12
  const viewportWidth = window.innerWidth
  const leftUnclamped = anchor.left + window.scrollX + anchor.width / 2 - width / 2
  const left = Math.min(Math.max(leftUnclamped, 12), viewportWidth - width - 12)

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-50"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="pointer-events-auto"
        style={{
          position: "absolute",
          top,
          left,
          width,
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
