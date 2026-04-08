import { Resend } from "resend"

let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error("RESEND_API_KEY not configured")
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

interface SendNotificationOptions {
  to: string
  subject: string
  html: string
}

export async function sendNotification(options: SendNotificationOptions) {
  const resend = getResendClient()
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@vibe-kanban.dev"

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
  return data
}

export async function sendStoryCompletionNotification(
  email: string,
  storyTitle: string,
  repoName: string
) {
  return sendNotification({
    to: email,
    subject: `Story completed: ${storyTitle}`,
    html: `
      <h2>Story Completed</h2>
      <p><strong>${storyTitle}</strong> in <code>${repoName}</code> has been completed by Claude Code.</p>
      <p>Check the <a href="http://localhost:3001/dashboard">dashboard</a> to review the changes.</p>
    `,
  })
}
