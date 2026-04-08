import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, GitBranch, Zap, ArrowRight } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl text-center space-y-8">
        <div className="flex items-center justify-center gap-3">
          <LayoutDashboard className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Vibe Kanban</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Connect your GitHub repos, extract user stories from project files,
          and automate development with Claude Code.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="p-4 rounded-lg border bg-card">
            <GitBranch className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">GitHub Repos</h3>
            <p className="text-sm text-muted-foreground">
              Select and track your repositories. Stories are parsed from MD
              files.
            </p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <LayoutDashboard className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Kanban Board</h3>
            <p className="text-sm text-muted-foreground">
              Drag stories through Backlog, To Do, In Progress, Review, Done.
            </p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <Zap className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Claude Code</h3>
            <p className="text-sm text-muted-foreground">
              Move to In Progress and Claude Code starts coding automatically.
            </p>
          </div>
        </div>

        <Link href="/dashboard">
          <Button size="lg" className="gap-2">
            Open Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
