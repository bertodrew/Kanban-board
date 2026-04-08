import { test, expect } from "@playwright/test"

const BASE_URL = "http://localhost:3001"

const TEST_DATA = {
  state: {
    githubToken: null,
    githubUser: null,
    anthropicApiKey: null,
    anthropicKeyValid: false,
    projects: [
      {
        id: "test-project-1",
        name: "Test Project",
        color: "#3b82f6",
        repoIds: [123],
        status: "open",
        createdAt: "2026-03-29T00:00:00.000Z",
      },
    ],
    activeProjectId: "test-project-1",
    stories: [
      {
        id: "story-1",
        title: "Implement login page",
        description: "Create a login page with email and password",
        acceptanceCriteria: ["Has email field", "Has password field"],
        stage: "backlog",
        projectId: "test-project-1",
        repoFullName: "test/repo",
        repoId: 123,
        sourceFile: "README.md",
        priority: "high",
        createdAt: "2026-03-29T00:00:00.000Z",
        updatedAt: "2026-03-29T00:00:00.000Z",
      },
      {
        id: "story-2",
        title: "Add user profile",
        description: "User can view and edit their profile",
        acceptanceCriteria: [],
        stage: "backlog",
        projectId: "test-project-1",
        repoFullName: "test/repo",
        repoId: 123,
        sourceFile: "README.md",
        priority: "medium",
        createdAt: "2026-03-29T00:00:00.000Z",
        updatedAt: "2026-03-29T00:00:00.000Z",
      },
      {
        id: "story-3",
        title: "Setup CI/CD",
        description: "Configure GitHub Actions pipeline",
        acceptanceCriteria: [],
        stage: "todo",
        projectId: "test-project-1",
        repoFullName: "test/repo",
        repoId: 123,
        sourceFile: "TODO.md",
        priority: "low",
        createdAt: "2026-03-29T00:00:00.000Z",
        updatedAt: "2026-03-29T00:00:00.000Z",
      },
    ],
    repos: [
      {
        id: 123,
        fullName: "test/repo",
        name: "repo",
        owner: "test",
        description: "Test repo",
        url: "https://github.com/test/repo",
        defaultBranch: "main",
      },
    ],
  },
  version: 0,
}

test.describe("Kanban UX Testing", () => {
  test.beforeEach(async ({ page, context }) => {
    // Seed localStorage BEFORE page load (zustand v5 persist hydrates on init)
    await context.addInitScript((data) => {
      localStorage.setItem("vibe-kanban-v2", JSON.stringify(data))
    }, TEST_DATA)
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForTimeout(500)
  })

  test("dashboard loads with project and stories visible", async ({ page }) => {
    // Project name should be visible (appears in both switcher and board header)
    await expect(page.getByText("Test Project").first()).toBeVisible()

    // Stories count
    await expect(page.getByText("3 stories")).toBeVisible()

    // Column headers should be visible
    await expect(page.getByText("Backlog")).toBeVisible()
    await expect(page.getByText("To Do")).toBeVisible()
    await expect(page.getByText("In Progress")).toBeVisible()
    await expect(page.getByText("In Review")).toBeVisible()
    await expect(page.getByText("Done")).toBeVisible()

    // Story cards should be visible
    await expect(page.getByText("Implement login page")).toBeVisible()
    await expect(page.getByText("Add user profile")).toBeVisible()
    await expect(page.getByText("Setup CI/CD")).toBeVisible()
  })

  test("story cards show correct metadata", async ({ page }) => {
    const card = page.locator("text=Implement login page").first()
    await expect(card).toBeVisible()

    // Priority badge should be visible
    await expect(page.locator("text=high").first()).toBeVisible()

    // Repo name badge
    await expect(page.locator("text=repo").first()).toBeVisible()
  })

  test("columns show correct story counts", async ({ page }) => {
    // Backlog column header shows count badge "2"
    const backlogHeader = page.getByText("Backlog").locator("..")
    await expect(backlogHeader.getByText("2")).toBeVisible()

    // To Do column header shows count badge "1"
    const todoHeader = page.getByText("To Do").locator("..")
    await expect(todoHeader.getByText("1")).toBeVisible()
  })

  test("drag and drop - move story from Backlog to To Do", async ({
    page,
  }) => {
    // Find the story card
    const storyCard = page.getByText("Implement login page")
    await expect(storyCard).toBeVisible()

    // Find the drag handle (GripVertical icon button)
    const card = storyCard.locator("..")
    const dragHandle = card.locator("button").first()

    // Find the "To Do" column drop target
    const todoColumn = page.locator("text=To Do").locator("..").locator("..")

    // Get bounding boxes
    const handleBox = await dragHandle.boundingBox()
    const todoBox = await todoColumn.boundingBox()

    if (!handleBox || !todoBox) {
      test.fail(true, "Could not find drag handle or todo column bounding boxes")
      return
    }

    // Perform drag and drop
    const startX = handleBox.x + handleBox.width / 2
    const startY = handleBox.y + handleBox.height / 2
    const endX = todoBox.x + todoBox.width / 2
    const endY = todoBox.y + todoBox.height / 2

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    // Move in steps to trigger dnd-kit's distance activation constraint (5px)
    await page.mouse.move(startX + 10, startY, { steps: 3 })
    await page.mouse.move(endX, endY, { steps: 10 })
    await page.waitForTimeout(200)
    await page.mouse.up()

    await page.waitForTimeout(500)

    // Take a screenshot to see the result
    await page.screenshot({
      path: "e2e/screenshots/after-drag-backlog-to-todo.png",
      fullPage: true,
    })

    // Verify: check localStorage for the updated state
    const storeData = await page.evaluate(() => {
      const raw = localStorage.getItem("vibe-kanban-v2")
      return raw ? JSON.parse(raw) : null
    })

    const story1 = storeData?.state?.stories?.find(
      (s: { id: string }) => s.id === "story-1"
    )
    console.log("Story-1 stage after drag:", story1?.stage)
  })

  test("drag and drop - verify DndContext is rendered", async ({ page }) => {
    // Check that dnd-kit elements are present in the DOM
    // dnd-kit sortable items have data-sortable attributes or specific roles
    const sortableItems = await page.locator("[style*='transform']").count()
    console.log("Elements with transform style:", sortableItems)

    // Check cards have the grab cursor
    const cards = page.locator("[class*='cursor-grab']")
    const cardCount = await cards.count()
    console.log("Cards with cursor-grab:", cardCount)

    expect(cardCount).toBeGreaterThan(0)

    // Screenshot the initial state
    await page.screenshot({
      path: "e2e/screenshots/initial-board-state.png",
      fullPage: true,
    })
  })

  test("drag and drop - detailed pointer sequence", async ({ page }) => {
    // More thorough drag test with detailed logging
    const cards = page.locator("[class*='cursor-grab']")
    const cardCount = await cards.count()
    console.log(`Found ${cardCount} draggable cards`)

    if (cardCount === 0) {
      test.fail(true, "No draggable cards found on the board")
      return
    }

    // Get the drag handle (button) inside the first card - listeners are on the handle, not the card
    const firstCard = cards.first()
    const dragHandle = firstCard.locator("button").first()
    const cardBox = await dragHandle.boundingBox()
    console.log("Drag handle box:", cardBox)

    if (!cardBox) {
      test.fail(true, "Could not get drag handle bounding box")
      return
    }

    // Find all column headers and their positions
    const columns = ["Backlog", "To Do", "In Progress", "In Review", "Done"]
    for (const col of columns) {
      const colEl = page.getByText(col, { exact: true }).first()
      const box = await colEl.boundingBox()
      console.log(`Column "${col}" position:`, box)
    }

    // Attempt drag: card from Backlog toward "To Do" column
    const todoHeader = page.getByText("To Do", { exact: true }).first()
    const todoBox = await todoHeader.boundingBox()

    if (!todoBox) {
      test.fail(true, "Could not find To Do column")
      return
    }

    const startX = cardBox.x + cardBox.width / 2
    const startY = cardBox.y + cardBox.height / 2
    // Target: center of To Do column, below header
    const endX = todoBox.x + todoBox.width / 2
    const endY = todoBox.y + 100

    console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`)

    // Start drag
    await page.mouse.move(startX, startY)
    await page.mouse.down()

    // Move past activation distance (5px threshold)
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(startX + i * 3, startY, { steps: 1 })
      await page.waitForTimeout(30)
    }

    // Check if drag overlay appeared
    await page.waitForTimeout(200)
    const overlayVisible = await page.locator("[style*='position: fixed']").count()
    console.log("Overlay-like fixed elements during drag:", overlayVisible)

    await page.screenshot({
      path: "e2e/screenshots/during-drag.png",
      fullPage: true,
    })

    // Move to target
    const steps = 15
    for (let i = 1; i <= steps; i++) {
      const x = startX + ((endX - startX) * i) / steps
      const y = startY + ((endY - startY) * i) / steps
      await page.mouse.move(x, y, { steps: 1 })
      await page.waitForTimeout(30)
    }

    await page.waitForTimeout(200)
    await page.screenshot({
      path: "e2e/screenshots/at-drop-target.png",
      fullPage: true,
    })

    // Drop
    await page.mouse.up()
    await page.waitForTimeout(500)

    await page.screenshot({
      path: "e2e/screenshots/after-drop.png",
      fullPage: true,
    })

    // Check the resulting store state
    const storeData = await page.evaluate(() => {
      const raw = localStorage.getItem("vibe-kanban-v2")
      return raw ? JSON.parse(raw) : null
    })

    const allStories = storeData?.state?.stories || []
    for (const s of allStories) {
      console.log(`Story "${s.title}" -> stage: ${s.stage}`)
    }

    // Verify "Implement login page" moved to "todo"
    const story1 = allStories.find(
      (s: { id: string }) => s.id === "story-1"
    )
    expect(story1?.stage).toBe("todo")
  })

  test("project switcher works", async ({ page }) => {
    // Click the project switcher button
    const switcher = page.getByText("Test Project").first()
    await switcher.click()

    // The dropdown should show the project
    await expect(page.locator("text=Test Project").nth(1)).toBeVisible()

    // Screenshot
    await page.screenshot({
      path: "e2e/screenshots/project-switcher-open.png",
      fullPage: true,
    })
  })
})
