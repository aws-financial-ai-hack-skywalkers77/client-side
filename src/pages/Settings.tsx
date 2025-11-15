import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/ThemeToggle"

export function Settings() {
  return (
    <div className="space-y-8">
      <Card className="border-border shadow-sm">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Account preferences</CardTitle>
          <CardDescription>
            Configure your DocuFlow workspace preferences and notification defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 px-6 pb-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input id="display-name" placeholder="Avery Chen" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="avery.chen@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Theme</Label>
            <ThemeToggle />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook">Webhook URL</Label>
            <Input
              id="webhook"
              placeholder="https://hooks.zapier.com/..."
              className="font-mono text-xs"
            />
          </div>
          <div className="md:col-span-2">
            <Button>Save preferences</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="px-6 pt-6">
          <CardTitle>API credentials</CardTitle>
          <CardDescription>
            Rotate secrets for FastAPI integrations and regenerate access tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-6 pb-6 text-sm text-muted-foreground">
          <p>
            Use the FastAPI server&rsquo;s <code>/health</code> endpoint to monitor availability.
            Regenerated tokens propagate instantly to Landing AI ADE workflows.
          </p>
          <Button variant="outline" className="w-fit">
            Generate new token
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

