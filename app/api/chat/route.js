import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get ALL user's files
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (filesError) {
      console.error('Files error:', filesError)
      return NextResponse.json(
        { error: filesError.message },
        { status: 500 }
      )
    }

    // Format files for frontend
    const formattedFiles = files.map(file => ({
      id: file.id,
      name: file.name,
      size: `${(file.file_size / 1024).toFixed(2)} KB`,
      type: file.file_type,
      uploadedAt: new Date(file.created_at).toLocaleString()
    }))

    return NextResponse.json({
      success: true,
      files: formattedFiles
    })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch files' },
      { status: 500 }
    )
  }
}
