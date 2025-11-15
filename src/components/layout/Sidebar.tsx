import { useState, useEffect } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { 
  LayoutGrid, 
  UploadCloud, 
  Files, 
  Receipt, 
  FileSignature, 
  TrendingUp, 
  Cog, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react"

import { cn } from "@/lib/utils"

const navItemsBeforeDocuments = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/upload", label: "Upload", icon: UploadCloud },
]

const navItemsAfterDocuments = [
  { to: "/reports", label: "Reports", icon: TrendingUp },
  { to: "/settings", label: "Settings", icon: Cog },
]

const documentsSubItems = [
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/contracts", label: "Contracts", icon: FileSignature },
]

export function Sidebar() {
  const location = useLocation()
  const isDocumentsRoute = location.pathname === "/invoices" || location.pathname === "/contracts"
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(isDocumentsRoute)

  useEffect(() => {
    if (isDocumentsRoute) {
      setIsDocumentsExpanded(true)
    }
  }, [isDocumentsRoute])

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
        {navItemsBeforeDocuments.map((item) => (
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
        
        {/* Documents section with tree structure */}
        <div className="space-y-0">
          <button
            onClick={() => setIsDocumentsExpanded(!isDocumentsExpanded)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <div className="flex items-center gap-3">
              <Files className="h-4 w-4" />
              <span>Documents</span>
            </div>
            {isDocumentsExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {isDocumentsExpanded && (
            <div className="relative ml-4 mt-1 space-y-0 pb-2">
              {/* Main vertical tree connector line */}
              <div className="absolute left-0 top-0 bottom-2 w-[1px] bg-border/60" />
              
              {documentsSubItems.map((subItem, index) => {
                const isActive = location.pathname === subItem.to
                const isLast = index === documentsSubItems.length - 1
                
                return (
                  <div key={subItem.to} className="relative">
                    {/* Horizontal connector line from vertical to item */}
                    <div className="absolute left-0 top-[18px] h-[1px] w-4 bg-border/60" />
                    {/* Vertical continuation line (if not last item) */}
                    {!isLast && (
                      <div className="absolute left-0 top-[18px] bottom-0 w-[1px] bg-border/60" />
                    )}
                    
                    <NavLink
                      to={subItem.to}
                      className={({ isActive: navIsActive }) =>
                        cn(
                          "relative ml-6 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                          navIsActive || isActive
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                        )
                      }
                    >
                      <subItem.icon className="h-4 w-4" />
                      {subItem.label}
                    </NavLink>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {navItemsAfterDocuments.map((item) => (
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

