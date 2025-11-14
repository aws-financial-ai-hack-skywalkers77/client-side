import { type ComponentType, type MouseEvent } from "react"
import { Briefcase, Calculator, FileBadge, ShieldCheck } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type ProfessionalRole =
  | "auditor"
  | "charteredAccountant"
  | "complianceOfficer"
  | "financialConsultant"

type RoleSelectionProps = {
  onSelect: (role: ProfessionalRole) => void
}

const roles: Array<{
  id: ProfessionalRole
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  accent: string
  status?: "available" | "comingSoon"
}> = [
  {
    id: "auditor",
    title: "Auditor",
    description: "Comprehensive auditing workflows and risk assessment tools",
    icon: ShieldCheck,
    accent:
      "from-background via-primary/5 to-primary/10 dark:from-background dark:via-primary/10 dark:to-primary/5",
    status: "available",
  },
  {
    id: "charteredAccountant",
    title: "Chartered Accountant",
    description: "Financial reporting, tax planning, and compliance management",
    icon: Calculator,
    accent:
      "from-background via-accent/5 to-accent/10 dark:from-background dark:via-accent/10 dark:to-accent/5",
    status: "comingSoon",
  },
  {
    id: "complianceOfficer",
    title: "Compliance Officer",
    description: "Regulatory compliance tracking and documentation",
    icon: FileBadge,
    accent:
      "from-background via-secondary/30 to-secondary/50 dark:from-background dark:via-secondary/20 dark:to-secondary/10",
    status: "comingSoon",
  },
  {
    id: "financialConsultant",
    title: "Financial Consultant",
    description: "Advisory services and strategic financial planning",
    icon: Briefcase,
    accent:
      "from-background via-muted/50 to-muted/30 dark:from-background dark:via-muted/30 dark:to-muted/20",
    status: "comingSoon",
  },
]

export function RoleSelection({ onSelect }: RoleSelectionProps) {
  const handleSelect = (role: ProfessionalRole) => (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    onSelect(role)
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-200px)] max-w-5xl flex-col justify-center space-y-12 text-center">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wider text-muted-foreground">
          Welcome to DocuFlow
        </p>
        <h2 className="text-3xl font-semibold">Select your professional category to begin</h2>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          Tailor the document processing workspace to your role. Choose the workflow that best fits
          your daily tasks to unlock dashboards, AI guidance, and analysis tuned for your needs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {roles.map((role) => (
          <Card
            key={role.id}
            role="button"
            tabIndex={0}
            onClick={handleSelect(role.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onSelect(role.id)
              }
            }}
            className={cn(
              "group relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br shadow-lg",
              role.accent,
              "transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full border border-white/40 bg-white/30 blur-3xl dark:border-white/5 dark:bg-white/5" />
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 backdrop-blur">
                <role.icon
                  className={cn(
                    "h-6 w-6 text-primary",
                  )}
                />
              </div>
              <CardTitle className="flex items-center gap-2 text-left text-2xl font-semibold text-foreground">
                <span>{role.title}</span>
                {role.status === "comingSoon" ? (
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-dashed border-primary/40 bg-background/80 px-3 py-1 text-xs uppercase tracking-wide text-primary shadow-sm backdrop-blur-sm"
                  >
                    Coming Soon
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-left text-sm text-muted-foreground">
              {role.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

