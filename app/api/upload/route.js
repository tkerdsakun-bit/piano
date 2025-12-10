import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase-server'
import { parseFile } from '../../../lib/fileParser'
import { uploadFile, saveFileMetadata } from '../../../lib/supabase'

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

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name}`

    const content = await parseFile(file, file.type)

    const uploadData = await uploadFile(file, fileName, user.id)

    const fileMetadata = {
      name: file.name,
      file_path: uploadData.path,
      file_type: file.type,
      file_size: file.size,
      content: content,
      created_at: new Date().toISOString()
    }

    const savedFile = await saveFileMetadata(fileMetadata, user.id)

    return NextResponse.json({
      success: true,
      file: {
        id: savedFile.id,
        name: savedFile.name,
        size: `${(savedFile.file_size / 1024).toFixed(2)} KB`,
        type: savedFile.file_type,
        uploadedAt: new Date(savedFile.created_at).toLocaleString()
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
