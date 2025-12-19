import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const token = request.cookies.get('gdrive_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: token })

    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    // Fetch files with filtering
    const response = await drive.files.list({
      pageSize: 100,
      fields: 'files(id, name, mimeType, size, modifiedTime, iconLink, webViewLink)',
      q: "trashed=false and (mimeType='application/pdf' or mimeType='text/plain' or mimeType contains 'document' or mimeType contains 'spreadsheet' or mimeType contains 'presentation')",
      orderBy: 'modifiedTime desc'
    })

    return NextResponse.json({ 
      files: response.data.files || [],
      success: true 
    })
  } catch (error) {
    console.error('List files error:', error)

    // Check if token expired
    if (error.code === 401) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }

    return NextResponse.json({ 
      error: 'Failed to list files',
      details: error.message 
    }, { status: 500 })
  }
}
