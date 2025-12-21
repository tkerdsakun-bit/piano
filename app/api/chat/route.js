// app/api/chat/route.js
// ✅ FINAL VERSION - NO GOOGLE DRIVE OAUTH

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chatWithAI } from '../../../lib/gemini'

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
    console.log('Total files: ' + fileContents.length)

    const response = await chatWithAI(
      message,
      fileContents,
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
