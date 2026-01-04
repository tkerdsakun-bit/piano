import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseFile } from '../../../lib/fileParser'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
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
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const scope = formData.get('scope') || 'user' // 'user' or 'global'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('📤 Uploading:', file.name, file.size, 'bytes', '| Scope:', scope)

    // Generate safe filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const extension = file.name.substring(file.name.lastIndexOf('.')) || ''
    const safeFileName = `${timestamp}_${randomStr}${extension.toLowerCase()}`
    
    // ✅ FIXED: Store all files in user folder, prefix global files
    let filePath
    if (scope === 'global') {
      filePath = `${user.id}/global_${safeFileName}`
    } else {
      filePath = `${user.id}/${safeFileName}`
    }

    console.log('📝 Original name:', file.name)
    console.log('📝 Safe name:', safeFileName)
    console.log('📁 Path:', filePath)
    console.log('🌍 Scope:', scope)

    // Parse file content
    let content = ''
    try {
      content = await parseFile(file, file.type)
      console.log('✅ Parsed:', content.length, 'characters')
    } catch (parseError) {
      console.error('Parse error:', parseError)
      content = `📄 File: ${file.name}\n❌ Could not parse content: ${parseError.message}`
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Uploaded to storage:', uploadData.path)

    // Save to database with scope
    const { data: savedFile, error: dbError } = await supabase
      .from('files')
      .insert([{
        user_id: user.id,
        name: file.name,
        file_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        content: content,
        scope: scope
      }])
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Saved to database:', savedFile.id, '| Scope:', scope)

    return NextResponse.json({
      success: true,
      file: {
        id: savedFile.id,
        name: savedFile.name,
        size: `${(savedFile.file_size / 1024).toFixed(2)} KB`,
        type: savedFile.file_type,
        scope: savedFile.scope,
        uploadedAt: new Date(savedFile.created_at).toLocaleString()
      }
    })

  } catch (error) {
    console.error('❌ Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
