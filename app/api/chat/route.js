import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chatWithAI } from '../../../lib/gemini';  // Importing the chatWithAI function from lib/gemini

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

    // Get the message from the request
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      );
    }

    // Fetch files from Supabase (optional: if you want to include user-uploaded files)
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filesError) {
      console.error('Files error:', filesError);
      return NextResponse.json(
        { error: `Failed to fetch files: ${filesError.message}` },
        { status: 500 }
      );
    }

    // Map file contents to pass to the AI model
    const fileContents = files.map((file) => ({
      name: file.name,
      content: file.content || '',
    }));

    console.log(`Processing ${files.length} files for user ${user.id}`);

    // Call the chatWithAI function to generate a response using OpenAI
    const response = await chatWithAI(message, fileContents);

    return NextResponse.json({
      success: true,
      response: response,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Chat failed' },
      { status: 500 }
    );
  }
}
