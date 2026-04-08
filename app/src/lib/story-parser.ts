import type { Story, Stage } from "@/types"

function generateId(): string {
  return crypto.randomUUID()
}

interface ParsedStory {
  title: string
  description: string
  acceptanceCriteria: string[]
  priority: "low" | "medium" | "high"
}

export function parseStoriesFromMarkdown(content: string): ParsedStory[] {
  const stories: ParsedStory[] = []

  // Pattern 1: "## User Story: ..." or "### User Story: ..."
  const userStoryRegex =
    /#{2,3}\s*(?:User Story|Story|Feature|Task):\s*(.+?)(?=\n#{2,3}\s|$)/gi
  let match = userStoryRegex.exec(content)
  while (match) {
    const block = match[0]
    const title = match[1].trim()
    const story = extractStoryDetails(title, block)
    stories.push(story)
    match = userStoryRegex.exec(content)
  }

  // Pattern 2: Checklist items "- [ ] ..." as stories
  if (stories.length === 0) {
    const checklistRegex = /^-\s*\[[ x]\]\s*(.+)$/gm
    let checkMatch = checklistRegex.exec(content)
    while (checkMatch) {
      stories.push({
        title: checkMatch[1].trim(),
        description: checkMatch[1].trim(),
        acceptanceCriteria: [],
        priority: "medium",
      })
      checkMatch = checklistRegex.exec(content)
    }
  }

  // Pattern 3: "As a ... I want ... so that ..."
  if (stories.length === 0) {
    const asARegex = /(?:^|\n)(As an?\s.+?(?:so that\s.+?)?)\s*(?=\n|$)/gi
    let asMatch = asARegex.exec(content)
    while (asMatch) {
      const text = asMatch[1].trim()
      stories.push({
        title: text.slice(0, 100),
        description: text,
        acceptanceCriteria: [],
        priority: "medium",
      })
      asMatch = asARegex.exec(content)
    }
  }

  return stories
}

function extractStoryDetails(title: string, block: string): ParsedStory {
  const acRegex = /(?:acceptance criteria|ac|done when)[:\s]*\n((?:\s*[-*]\s*.+\n?)+)/gi
  const acMatch = acRegex.exec(block)
  const acceptanceCriteria: string[] = []
  if (acMatch) {
    const lines = acMatch[1].split("\n")
    for (const line of lines) {
      const cleaned = line.replace(/^\s*[-*]\s*/, "").trim()
      if (cleaned) acceptanceCriteria.push(cleaned)
    }
  }

  let priority: "low" | "medium" | "high" = "medium"
  if (/priority:\s*high|P0|P1|critical|urgent/i.test(block)) priority = "high"
  else if (/priority:\s*low|P3|nice.to.have/i.test(block)) priority = "low"

  const descLines = block
    .split("\n")
    .slice(1)
    .filter((l) => !l.match(/^#{2,3}\s/) && !l.match(/acceptance criteria/i))
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .trim()

  return {
    title,
    description: descLines || title,
    acceptanceCriteria,
    priority,
  }
}

export function createStoriesFromParsed(
  parsed: ParsedStory[],
  repoFullName: string,
  repoId: number,
  sourceFile: string,
  stage: Stage = "backlog",
  projectId: string = ""
): Story[] {
  const now = new Date().toISOString()
  return parsed.map((p) => ({
    id: generateId(),
    title: p.title,
    description: p.description,
    acceptanceCriteria: p.acceptanceCriteria,
    stage,
    projectId,
    repoFullName,
    repoId,
    sourceFile,
    priority: p.priority,
    createdAt: now,
    updatedAt: now,
  }))
}
