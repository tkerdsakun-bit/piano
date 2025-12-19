import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_URL}/api/google/callback`
    )

    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ]

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL}/?error=oauth_failed`)
  }
}
