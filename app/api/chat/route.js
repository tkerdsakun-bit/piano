import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chatWithAI } from '../../../lib/gemini'
import { google } from 'googleapis'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      message,
      fileContents = [],
      driveFileIds = [],        // ⭐ NEW - Drive file IDs
      useOwnKey = false,
      provider = 'perplexity',
      model = null,
    } = body

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      )
    }

    const userApiKey = request.headers.get('X-User-API-Key')
    const userProvider = request.headers.get('X-AI-Provider') || provider
    const userModel = request.headers.get('X-AI-Model') || model

    if (useOwnKey && !userApiKey) {
      return NextResponse.json(
        { error: 'API Key required when using your own key' },
        { status: 400 }
      )
    }

    console.log('Processing message for user ' + user.id)
    console.log('Using own key: ' + useOwnKey)
    console.log('Provider: ' + userProvider)
    console.log('Model: ' + userModel)

    // ⭐ NEW - Fetch Google Drive files if provided
    let driveContents = []
    if (driveFileIds && driveFileIds.length > 0) {
      try {
        const driveToken = request.cookies.get('gdrive_token')?.value
        if (driveToken) {
          console.log('Fetching ' + driveFileIds.length + ' files from Drive')
          driveContents = await fetchDriveFiles(driveToken, driveFileIds)
          console.log('Fetched ' + driveContents.length + ' Drive files successfully')
        } else {
          console.warn('Drive token not found, skipping Drive files')
        }
      } catch (error) {
        console.error('Drive fetch error:', error)
        // Continue without Drive files - don't fail the entire request
      }
    }

    // ⭐ NEW - Combine uploaded files and Drive files
    const allFiles = [...fileContents, ...driveContents]
    console.log('Total files: ' + allFiles.length + ' (uploaded: ' + fileContents.length + ', drive: ' + driveContents.length + ')')

    const response = await chatWithAI(
      message,
      allFiles,              // ⭐ UPDATED - Use combined files
      userApiKey || null,
      userProvider,
      userModel
    )

    return NextResponse.json({
      success: true,
      response: response,
    })
  } catch (error) {
    console.error('Chat error:', error)
    if (
      error.message.includes('401') ||
      error.message.toLowerCase().includes('unauthorized') ||
      error.message.toLowerCase().includes('invalid')
    ) {
      return NextResponse.json(
        { error: 'Invalid API Key. Please check your API key.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Chat failed' },
      { status: 500 }
    )
  }
}

// ⭐ NEW - Fetch files from Google Drive
async function fetchDriveFiles(accessToken, fileIds) {
  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    const fileContents = []

    for (const fileId of fileIds) {
      try {
        // Get file metadata
        const metadata = await drive.files.get({
          fileId,
          fields: 'name, mimeType'
        })

        let content = ''

        // Handle different file types
        const mimeType = metadata.data.mimeType

        if (mimeType === 'application/vnd.google-apps.document') {
          // Google Docs - export as plain text
          const response = await drive.files.export({
            fileId,
            mimeType: 'text/plain'
          }, { responseType: 'text' })
          content = response.data
        } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
          // Google Sheets - export as CSV
          const response = await drive.files.export({
            fileId,
            mimeType: 'text/csv'
          }, { responseType: 'text' })
          content = response.data
        } else if (mimeType === 'application/vnd.google-apps.presentation') {
          // Google Slides - export as plain text
          const response = await drive.files.export({
            fileId,
            mimeType: 'text/plain'
          }, { responseType: 'text' })
          content = response.data
        } else {
          // Other files (PDF, TXT, etc.) - download directly
          const response = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'text' }
          )
          content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
        }

        fileContents.push({
          name: metadata.data.name,
          content: content
        })

        console.log('Fetched: ' + metadata.data.name + ' (' + content.length + ' chars)')
      } catch (error) {
        console.error('Error fetching file ' + fileId + ':', error.message)
        // Continue with other files even if one fails
      }
    }

    return fileContents
  } catch (error) {
    console.error('Drive fetch error:', error)
    return []
  }
}
