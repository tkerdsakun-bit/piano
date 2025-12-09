import { NextResponse } from 'next/server'
import { chatWithAI } from '../../../lib/gemini'
import { getUserFiles, getCurrentUser } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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