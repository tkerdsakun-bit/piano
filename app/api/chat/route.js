oute_js_content = """import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chatWithAI } from '../../../lib/gemini';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request) {
  try {
    // Check for authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get the message and BYOK flag from the request
    const body = await request.json();
    const { message, fileContents = [], useOwnKey = false } = body;
    
    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      );
    }

    // 🆕 Get user's API key if they're using their own
    const userApiKey = request.headers.get('X-User-API-Key');
    
    // Validate API key if user wants to use their own
    if (useOwnKey && !userApiKey) {
      return NextResponse.json(
        { error: 'API Key required when using your own key' },
        { status: 400 }
      );
    }

    console.log(`Processing message for user ${user.id}`);
    console.log(`Using own key: ${useOwnKey}`);
    console.log(`File contents count: ${fileContents.length}`);

    // Call the chatWithAI function with optional user API key
    const response = await chatWithAI(message, fileContents, userApiKey || null);

    return NextResponse.json({
      success: true,
      response: response,
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    // Handle specific API key errors
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Invalid API Key. Please check your Hugging Face API key.' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Chat failed' },
      { status: 500 }
    );
  }
}
