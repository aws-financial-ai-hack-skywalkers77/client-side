import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/context/ThemeContext"
import { Switch } from "@/components/ui/switch"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-3 rounded-full border border-border bg-secondary/40 px-3 py-1.5">
      <Sun className="h-4 w-4 text-muted-foreground transition-colors dark:text-muted" />
      <Switch
        checked={theme === "dark"}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle theme"
      />
      <Moon className="h-4 w-4 text-muted-foreground transition-colors dark:text-muted" />
    </div>
  )
}

