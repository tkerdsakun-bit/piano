import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase-server'
import { chatWithAI } from '../../../lib/gemini'
import { getUserFiles } from '../../../lib/supabase'

export async function POST(request) {
  try {
    // Get user from server-side Supabase client
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in again' },
        { status: 401 }
      )
    }

    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      )
    }

    const files = await getUserFiles(user.id)

    const fileContents = files.map(file => ({
      name: file.name,
      content: file.content
    }))

    const response = await chatWithAI(message, fileContents)

    return NextResponse.json({
      success: true,
      response: response
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Chat failed' },
      { status: 500 }
    )
  }
}
