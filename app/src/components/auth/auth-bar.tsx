"use client"

import { useEffect, useState } from "react"
import { useKanbanStore } from "@/stores/kanban-store"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Key, Check, Loader2, GitBranch } from "lucide-react"
import { toast } from "sonner"

export function AuthBar() {
  const {
    githubToken,
    githubUser,
    setGithubAuth,
    clearGithubAuth,
    anthropicApiKey,
    setAnthropicKey,
    setAnthropicKeyValid,
  } = useKanbanStore()

  const [ghInput, setGhInput] = useState("")
  const [ghValidating, setGhValidating] = useState(false)
  const [anthropicInput, setAnthropicInput] = useState("")
  const [anthropicValidating, setAnthropicValidating] = useState(false)

  // Handle OAuth callback hash fragment (if OAuth app is configured)
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith("#auth=")) {
      try {
        const payload = JSON.parse(decodeURIComponent(hash.slice(6)))
        setGithubAuth(payload.token, payload.user)
        toast.success(`Logged in as ${payload.user.login}`)
        window.history.replaceState(null, "", window.location.pathname)
      } catch {
        toast.error("Failed to parse auth data")
      }
    }
  }, [setGithubAuth])

  async function validateGitHubToken() {
    const token = ghInput.trim()
    if (!token) return
    setGhValidating(true)
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        toast.error("Invalid GitHub token")
        return
      }
      const data = await res.json()
      setGithubAuth(token, {
        login: data.login,
        avatarUrl: data.avatar_url,
        name: data.name,
      })
      setGhInput("")
      toast.success(`Connected as ${data.login}`)
    } catch {
      toast.error("Failed to validate GitHub token")
    } finally {
      setGhValidating(false)
    }
  }

  async function validateAnthropicKey() {
    const key = anthropicInput.trim()
    if (!key) return
    setAnthropicValidating(true)
    try {
      const res = await fetch("/api/auth/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      })
      const data = await res.json()
      if (data.valid) {
        setAnthropicKey(key)
        setAnthropicKeyValid(true)
        setAnthropicInput("")
        toast.success("Anthropic API key validated")
      } else {
        toast.error(data.error ?? "Invalid key")
      }
    } catch {
      toast.error("Failed to validate key")
    } finally {
      setAnthropicValidating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Anthropic key */}
      {anthropicApiKey ? (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <Check className="h-3 w-3" />
          Claude
        </span>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" />
            }
          >
            <Key className="h-3 w-3" />
            Claude API
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-3">
            <p className="text-xs text-muted-foreground mb-2">
              Anthropic API key for Claude Code automation
            </p>
            <div className="flex gap-1.5">
              <input
                type="password"
                placeholder="sk-ant-..."
                value={anthropicInput}
                onChange={(e) => setAnthropicInput(e.target.value)}
                className="flex-1 rounded border px-2 py-1 text-xs bg-background"
                onKeyDown={(e) => e.key === "Enter" && validateAnthropicKey()}
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={validateAnthropicKey}
                disabled={anthropicValidating}
              >
                {anthropicValidating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* GitHub auth */}
      {githubUser ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" />
            }
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {githubUser.login.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs">{githubUser.login}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled className="text-xs">
              {githubUser.name ?? githubUser.login}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {anthropicApiKey && (
              <DropdownMenuItem
                onClick={() => {
                  setAnthropicKey(null)
                  setAnthropicKeyValid(false)
                  toast.info("Anthropic key removed")
                }}
                className="text-xs"
              >
                <Key className="h-3 w-3 mr-1.5" />
                Remove Claude API key
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                clearGithubAuth()
                toast.info("Logged out")
              }}
              className="text-xs text-destructive"
            >
              <LogOut className="h-3 w-3 mr-1.5" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm" className="h-8 gap-1.5" />
            }
          >
            <GitBranch className="h-3.5 w-3.5" />
            Connect GitHub
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-3">
            <p className="text-xs font-medium mb-1">GitHub Personal Access Token</p>
            <p className="text-xs text-muted-foreground mb-2">
              Scope <code className="bg-muted px-1 rounded">repo</code> +{" "}
              <code className="bg-muted px-1 rounded">read:user</code>
            </p>
            <div className="flex gap-1.5">
              <input
                type="password"
                placeholder="ghp_xxxx or github_pat_xxxx"
                value={ghInput}
                onChange={(e) => setGhInput(e.target.value)}
                className="flex-1 rounded border px-2 py-1 text-xs bg-background"
                onKeyDown={(e) => e.key === "Enter" && validateGitHubToken()}
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={validateGitHubToken}
                disabled={ghValidating}
              >
                {ghValidating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
