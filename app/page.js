'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import React, { useState } from 'react'
import { Upload, Send, FileText, Loader2, Trash2, Sparkles, Database, LogOut, Download } from 'lucide-react'

export default function AIChatbot() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])

  // 🆕 ฟังก์ชันโหลดไฟล์จาก Database
  const loadUserFiles = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const formattedFiles = data.map(file => ({
        id: file.id,
        name: file.name,
        size: `${(file.file_size / 1024).toFixed(2)} KB`,
        uploadedAt: new Date(file.created_at).toLocaleString(),
        file_path: file.file_path,
        file_type: file.file_type,
        content: file.content
      }))
      
      setUploadedFiles(formattedFiles)
    } catch (error) {
      console.error('Error loading files:', error)
    }
  }

  // 🆕 โหลดไฟล์เมื่อ Component เริ่มต้น
  useEffect(() => {
    if (user) {
      loadUserFiles()
    }
  }, [user])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // 🆕 ฟังก์ชันดาวน์โหลดไฟล์
  const handleDownloadFile = async (file) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.file_path, 60)
      
      if (error) throw error
      
      // ดาวน์โหลดอัตโนมัติ
      const link = document.createElement('a')
      link.href = data.signedUrl
      link.download = file.name
      link.click()
      
    } catch (error) {
      console.error('Download error:', error)
      alert('ดาวน์โหลดไม่สำเร็จ: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Please login first')
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()

      // 🆕 โหลดข้อมูลใหม่จาก Database แทนการ push
      await loadUserFiles()

      alert('File uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed: ' + error.message)
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  const handleDeleteFile = async (file) => {
    if (!confirm(`Delete ${file.name}?`)) return

    try {
      setLoading(true)

      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([file.file_path])

      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      // 🆕 โหลดข้อมูลใหม่จาก Database แทนการ filter
      await loadUserFiles()

    } catch (error) {
      console.error('Delete error:', error)
      alert('Delete failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const fileContents = uploadedFiles.map(f => ({
        name: f.name,
        content: f.content
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: userMessage,
          fileContents
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' 
      }])
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Left Sidebar - Files Section */}
      <div className="w-80 bg-black border-r border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-white" />
              <span className="font-semibold text-white">Your Files</span>
            </div>
            <span className="text-sm text-gray-400">
              {uploadedFiles.length} files
            </span>
          </div>
          
          {/* Upload Button */}
          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-all cursor-pointer font-medium">
            <Upload className="w-4 h-4" />
            Upload File
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
          </label>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-4">
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No files yet</p>
              <p className="text-sm text-gray-600">Upload to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors border border-gray-800">
                  <FileText className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{file.name}</div>
                    <div className="text-sm text-gray-400">{file.size}</div>
                    <div className="text-xs text-gray-600">{file.uploadedAt}</div>
                  </div>
                  
                  {/* 🆕 ปุ่มดาวน์โหลด */}
                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="p-2 text-blue-400 hover:bg-gray-800 rounded-lg transition-colors"
                    title="ดาวน์โหลด"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  
                  {/* ปุ่มลบ */}
                  <button
                    onClick={() => handleDeleteFile(file)}
                    className="p-2 text-red-500 hover:bg-gray-800 rounded-lg transition-colors"
                    title="ลบ"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold">
                {user?.email?.[0].toUpperCase()}
              </div>
              <span className="text-sm text-gray-400 truncate">{user?.email}</span>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-black">
        {/* Header */}
        <div className="bg-black border-b border-gray-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Assistant</h1>
              <p className="text-sm text-gray-500">Ask me anything about your files</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-800">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Welcome to AI Document Assistant
              </h2>
              <p className="text-gray-500 mb-8">
                Upload documents and start asking questions. I'll help you find insights instantly.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <p className="text-sm text-gray-400">💡 Upload Excel files to analyze data</p>
                </div>
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <p className="text-sm text-gray-400">📄 Upload PDFs to extract information</p>
                </div>
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <p className="text-sm text-gray-400">📝 Upload Word docs to summarize content</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  } animate-fade-in`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-black" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                      msg.role === 'user'
                        ? 'bg-white text-black'
                        : 'bg-gray-900 text-white border border-gray-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                      {user?.email?.[0].toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-800 bg-black p-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your documents..."
                className="flex-1 px-6 py-4 bg-gray-900 text-white border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-white placeholder-gray-600"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-4 bg-white text-black rounded-xl hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-600 transition-all flex items-center gap-2 font-medium"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
