import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const storedState = request.cookies.get("github_oauth_state")?.value

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/dashboard?error=invalid_state`
    )
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/dashboard?error=missing_config`
    )
  }

  // Exchange code for token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/dashboard?error=token_exchange_failed`
    )
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token as string

  if (!accessToken) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/dashboard?error=no_token`
    )
  }

  // Fetch user info
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const userData = await userRes.json()

  // Redirect to dashboard with token + user data in hash (client-only, not in server logs)
  const authPayload = encodeURIComponent(
    JSON.stringify({
      token: accessToken,
      user: {
        login: userData.login,
        avatarUrl: userData.avatar_url,
        name: userData.name,
      },
    })
  )

  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/dashboard#auth=${authPayload}`
  )
  response.cookies.delete("github_oauth_state")

  return response
}
