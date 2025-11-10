import { type ComponentType, type MouseEvent } from "react"
import { Briefcase, Calculator, FileBadge, ShieldCheck } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
}> = [
  {
    id: "auditor",
    title: "Auditor",
    description: "Comprehensive auditing workflows and risk assessment tools",
    icon: ShieldCheck,
    accent:
      "from-white via-[#fff5e5] to-[#ffe5b8] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900",
  },
  {
    id: "charteredAccountant",
    title: "Chartered Accountant",
    description: "Financial reporting, tax planning, and compliance management",
    icon: Calculator,
    accent:
      "from-white via-[#f9f4ff] to-[#ecdeff] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900",
  },
  {
    id: "complianceOfficer",
    title: "Compliance Officer",
    description: "Regulatory compliance tracking and documentation",
    icon: FileBadge,
    accent:
      "from-white via-[#fff2e9] to-[#ffd9c2] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900",
  },
  {
    id: "financialConsultant",
    title: "Financial Consultant",
    description: "Advisory services and strategic financial planning",
    icon: Briefcase,
    accent:
      "from-white via-[#ecfff4] to-[#c8f9dc] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900",
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
              "transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_20px_45px_-25px_rgba(255,182,70,0.75)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full border border-white/40 bg-white/30 blur-3xl dark:border-white/5 dark:bg-white/5" />
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/80 backdrop-blur dark:bg-white/10">
                <role.icon
                  className={cn(
                    "h-6 w-6",
                    role.id === "auditor" && "text-sky-400",
                    role.id === "charteredAccountant" && "text-fuchsia-400",
                    role.id === "complianceOfficer" && "text-orange-400",
                    role.id === "financialConsultant" && "text-emerald-400",
                  )}
                />
              </div>
              <CardTitle className="text-left text-2xl font-semibold text-slate-800 dark:text-slate-100">
                {role.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-left text-sm text-slate-600 dark:text-slate-300">
              {role.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

