import { BellRing, Search } from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/ThemeToggle"

type TopNavProps = {
  onSearch?: (value: string) => void
  searchValue?: string
}

export function TopNav({ onSearch, searchValue = "" }: TopNavProps) {
  const [value, setValue] = useState(searchValue)

  useEffect(() => {
    setValue(searchValue)
  }, [searchValue])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch?.(value.trim())
  }

  return (
    <header className="flex h-20 items-center justify-between border-b border-[#DADADA] bg-white dark:bg-[#1A232E] dark:border-[#37475A]/30 px-6 shadow-sm">
      <form
        onSubmit={handleSubmit}
        className="flex max-w-xl flex-1 items-center rounded-lg border border-border dark:border-[#37475A]/50 bg-card dark:bg-[#1A232E] px-3 py-2 shadow-sm"
      >
        <Search className="mr-3 h-5 w-5 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value
            setValue(nextValue)
            onSearch?.(nextValue)
          }}
          placeholder="Search documents, IDs, or keywords..."
          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
        <Button type="submit" variant="ghost" size="icon" className="ml-2 h-8 w-8">
          <Search className="h-4 w-4" />
        </Button>
      </form>
      <div className="ml-6 flex items-center gap-4">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="relative">
          <BellRing className="h-5 w-5" />
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-4 min-w-[16px] px-1 text-[10px]"
          >
            3
          </Badge>
        </Button>
        <div className="flex items-center gap-3 rounded-full border border-border dark:border-[#37475A]/50 bg-card dark:bg-[#1A232E] px-3 py-2 shadow-sm">
          <div className="leading-tight">
            <p className="text-sm font-semibold">Avery Chen</p>
            <p className="text-xs text-muted-foreground">Lead Auditor</p>
          </div>
          <Avatar className="h-10 w-10">
            <AvatarFallback>AC</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

