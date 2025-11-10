import { Outlet } from "react-router-dom"
import { useCallback, useState } from "react"

import { Sidebar } from "@/components/layout/Sidebar"
import { TopNav } from "@/components/layout/TopNav"

export type LayoutContextValue = {
  searchTerm: string
  setSearchTerm: (value: string) => void
}

export function AppLayout() {
  const [searchTerm, setSearchTerm] = useState("")

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopNav onSearch={handleSearch} searchValue={searchTerm} />
        <main className="flex-1 overflow-y-auto bg-muted/10">
          <div className="container space-y-6 py-8">
            <Outlet context={{ searchTerm, setSearchTerm }} />
          </div>
        </main>
      </div>
    </div>
  )
}

