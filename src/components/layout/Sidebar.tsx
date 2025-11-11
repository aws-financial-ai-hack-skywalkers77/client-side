import { NavLink } from "react-router-dom"
import { BarChart3, FileText, FileSpreadsheet, LayoutDashboard, Settings, Upload } from "lucide-react"

import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/invoices", label: "Invoices", icon: FileSpreadsheet },
  { to: "/contracts", label: "Contracts", icon: FileText },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          DocuFlow
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Document Processing Platform
        </p>
      </div>
      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-6">
        <div className="rounded-xl border border-dashed border-muted-foreground/40 bg-secondary/20 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Need help?</p>
          <p className="mt-1 text-xs">
            Visit our knowledge base for integration guides.
          </p>
        </div>
      </div>
    </aside>
  )
}

