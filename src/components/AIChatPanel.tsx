import { type FormEvent, useMemo, useState } from "react"
import { ArrowUpRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Message = {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export type DashboardSection = "invoices" | "contracts" | "workflow"

type QuickAction = {
  label: string
  prompt: string
  response: string
  navigateTo?: DashboardSection
  keywords?: string[]
}

type AIChatPanelProps = {
  onNavigate?: (section: DashboardSection) => void
}

export function AIChatPanel({ onNavigate }: AIChatPanelProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [pendingAction, setPendingAction] = useState<QuickAction | null>(null)

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        label: "Show vendors with risk",
        prompt: "Which vendor contracts are currently flagged with risks?",
        response:
          "I've highlighted the contract metadata table. Review the rows flagged as risk-found and open details for clause-level insights.",
        navigateTo: "contracts",
        keywords: ["risk", "clause", "contract"],
      },
      {
        label: "Review invoice anomalies",
        prompt: "Do any invoices require anomaly review this quarter?",
        response:
          "Scroll to the invoice metadata table—focus on entries with outstanding variance markers. Use the details modal to inspect extracted fields.",
        navigateTo: "invoices",
        keywords: ["invoice", "anomaly", "duplicate"],
      },
      {
        label: "Workflow status",
        prompt: "Summarize our current workflow compliance status.",
        response:
          "The workflow analysis summary card is now in view. It consolidates backend checks for standards alignment across all vendors.",
        navigateTo: "workflow",
        keywords: ["workflow", "status", "compliance"],
      },
    ],
    [],
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim()) return

    const selectedQuickAction = pendingAction
    setPendingAction(null)

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    const lowerContent = userMessage.content.toLowerCase()
    const matchedAction =
      selectedQuickAction ??
      quickActions.find(
        (action) =>
          action.prompt.toLowerCase() === lowerContent ||
          action.keywords?.some((keyword) => lowerContent.includes(keyword)),
      )

    const assistantMessage: Message = {
      role: "assistant",
      content: matchedAction
        ? matchedAction.response
        : "I'll analyse that for you. Once the backend AI endpoint is connected, you'll see tailored insights right here.",
      timestamp: new Date().toLocaleTimeString(),
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, assistantMessage])
      if (matchedAction?.navigateTo) {
        onNavigate?.(matchedAction.navigateTo)
      }
    }, 600)
  }

  const handleQuickAction = (action: QuickAction) => {
    setInput(action.prompt)
    setPendingAction(action)
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-lg font-semibold">Ask the DocuFlow AI Assistant</CardTitle>
        <p className="text-sm text-muted-foreground">
          Pose questions about vendor risk, invoice anomalies, compliance exposure, or any custom
          workflow prompts. Responses will surface inline once the AI endpoint is connected.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full border border-[#FF9900]/20 dark:border-[#FFB84D]/30 bg-[#FF9900]/5 dark:bg-[#FF9900]/10 text-xs font-medium text-[#FF9900] dark:text-[#FFB84D] hover:bg-[#FF9900]/10 dark:hover:bg-[#FF9900]/20"
              onClick={() => handleQuickAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Ask your first question to start an AI-assisted conversation.
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message, index) => (
                <div
                  key={`${message.timestamp}-${index}`}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {message.role === "user" ? "You" : "AI Assistant"}
                    </span>
                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about vendor contracts, invoices, compliance, risk analysis..."
            className="min-h-[120px] resize-none"
          />
          <div className="flex items-center justify-end">
            <Button type="submit" className="gap-2">
              Send
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

