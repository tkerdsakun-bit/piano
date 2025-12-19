import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL}/?error=no_code`)
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_URL}/api/auth/google/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)

    // Store tokens in httpOnly cookies
    const response = NextResponse.redirect(process.env.NEXT_PUBLIC_URL)

    // Access token (expires in 1 hour)
    response.cookies.set('gdrive_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    })

    // Refresh token (if available)
    if (tokens.refresh_token) {
      response.cookies.set('gdrive_refresh', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      })
    }

    return response
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL}/?error=auth_failed`)
  }
}