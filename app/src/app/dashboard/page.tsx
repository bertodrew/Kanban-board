"use client"

import { useState } from "react"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { RepoSelector } from "@/components/repos/repo-selector"
import { AutomationPanel } from "@/components/automation/automation-panel"
import { ArchiveList } from "@/components/kanban/archive-list"
import { MultiProjectTerminal } from "@/components/terminal/multi-project-terminal"
import { AuthBar } from "@/components/auth/auth-bar"
import { ProjectSwitcher } from "@/components/projects/project-switcher"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Settings, LayoutDashboard, GitBranch, Zap, Terminal } from "lucide-react"
import { Toaster } from "sonner"

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex flex-col h-screen">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <header className="border-b px-4 py-2.5 flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Vibe Kanban</h1>
          </div>
          <ProjectSwitcher />
        </div>
        <div className="flex items-center gap-2">
          <AuthBar />
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger
              render={<Button variant="outline" size="sm" className="h-8" />}
            >
              <Settings className="h-4 w-4 mr-1.5" />
              Repos
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
              <SheetTitle>Repository Settings</SheetTitle>
              <div className="space-y-4 mt-4">
                <RepoSelector />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Tabs defaultValue="board" className="h-full flex flex-col">
          <div className="px-4 pt-3 shrink-0">
            <TabsList>
              <TabsTrigger value="board" className="gap-1.5">
                <GitBranch className="h-4 w-4" />
                Board
              </TabsTrigger>
              <TabsTrigger value="terminal" className="gap-1.5">
                <Terminal className="h-4 w-4" />
                Terminal
              </TabsTrigger>
              <TabsTrigger value="automation" className="gap-1.5">
                <Zap className="h-4 w-4" />
                Logs
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="board" className="flex-1 overflow-auto mt-0 pt-4">
            <KanbanBoard />
          </TabsContent>
          <TabsContent value="terminal" className="flex-1 overflow-hidden mt-0 p-4">
            <div className="h-full rounded-lg border shadow-sm overflow-hidden">
              <MultiProjectTerminal />
            </div>
          </TabsContent>
          <TabsContent value="automation" className="flex-1 overflow-auto mt-0 p-4">
            <div className="space-y-4">
              <AutomationPanel />
              <ArchiveList />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
