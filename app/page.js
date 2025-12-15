'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import React, { useState } from 'react'
import { Upload, Send, FileText, Loader2, Trash2, Sparkles, Database, LogOut, Download, X, AlertCircle, CheckCircle, Menu } from 'lucide-react'

export default function AIChatbot() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState([])
  const [notification, setNotification] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const chatAreaRef = useRef(null)
  const messagesEndRef = useRef(null)

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    
    setVH()
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', setVH)
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH)
    }
    
    return () => {
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setVH)
      }
    }
  }, [])

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
      showNotification('ไม่สามารถโหลดไฟล์ได้', 'error')
    }
  }

  useEffect(() => {
    if (user) {
      loadUserFiles()
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // 🆕 ใช้ API แบบเดิม
  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
    
    setLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error')
        return
      }

      let successCount = 0
      let failCount = 0

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        
        if (file.size > MAX_FILE_SIZE) {
          showNotification(`${file.name} ใหญ่เกิน 10 MB`, 'error')
          failCount++
          continue
        }
        
        setUploadProgress(prev => [...prev, {
          name: file.name,
          progress: 0
        }])

        try {
          const formData = new FormData()
          formData.append('file', file)

          console.log('📤 Uploading via API:', file.name)

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
          console.log('✅ Upload success:', result)

          setUploadProgress(prev => prev.map(p => 
            p.name === file.name ? { ...p, progress: 100 } : p
          ))
          successCount++

        } catch (error) {
          console.error(`Upload error for ${file.name}:`, error)
          showNotification(`${file.name}: ${error.message}`, 'error')
          setUploadProgress(prev => prev.filter(p => p.name !== file.name))
          failCount++
        }
      }

      if (successCount > 0) {
        await loadUserFiles()
        showNotification(`✅ อัปโหลดสำเร็จ ${successCount}/${fileArray.length} ไฟล์`, 'success')
        setIsSidebarOpen(false)
      } else if (failCount > 0) {
        showNotification(`❌ อัปโหลดล้มเหลวทั้งหมด`, 'error')
      }

    } catch (error) {
      console.error('Upload error:', error)
      showNotification('อัปโหลดล้มเหลว: ' + error.message, 'error')
    } finally {
      setLoading(false)
      setTimeout(() => setUploadProgress([]), 1000)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      uploadFiles(files)
    }
  }

  useEffect(() => {
    const handlePaste = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      const items = e.clipboardData?.items
      if (!items) return

      const files = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          files.push(items[i].getAsFile())
        }
      }

      if (files.length > 0) {
        e.preventDefault()
        uploadFiles(files)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [user])

  const handleFileUpload = async (event) => {
    const files = event.target.files
    await uploadFiles(files)
    event.target.value = ''
  }

  const handleDownloadFile = async (file) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.file_path, 60)
      
      if (error) throw error
      
      const link = document.createElement('a')
      link.href = data.signedUrl
      link.download = file.name
      link.click()
      
      showNotification(`กำลังดาวน์โหลด ${file.name}`, 'success')
      
    } catch (error) {
      console.error('Download error:', error)
      showNotification('ดาวน์โหลดไม่สำเร็จ', 'error')
    }
  }

  const handleDeleteFile = async (file) => {
    if (!confirm(`ต้องการลบ ${file.name} ใช่หรือไม่?`)) return

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

      await loadUserFiles()
      showNotification(`ลบ ${file.name} สำเร็จ`, 'success')

    } catch (error) {
      console.error('Delete error:', error)
      showNotification('ลบไฟล์ไม่สำเร็จ', 'error')
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
      showNotification('ส่งข้อความไม่สำเร็จ', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {notification && (
        <div className={`fixed top-4 left-4 right-4 mx-auto z-[60] flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border animate-fade-in max-w-md ${
          notification.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' :
          notification.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' :
          'bg-blue-500/10 border-blue-500/50 text-blue-400'
        }`}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="font-medium text-sm flex-1">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-[85vw] sm:w-80 max-w-sm bg-black border-r border-gray-800 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-gray-400 hover:text-white z-10"
        >
          <X className="w-6 h-6" />
        </button>

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
          
          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-all cursor-pointer font-medium">
            <Upload className="w-4 h-4" />
            Upload
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              multiple
            />
          </label>
          <p className="text-xs text-gray-600 mt-2 text-center">Max 10 MB per file</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No files yet</p>
              <p className="text-sm text-gray-600">Upload files to start</p>
            </div>
          ) : (
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-start gap-2 p-3 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors border border-gray-800">
                  <FileText className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate text-sm">{file.name}</div>
                    <div className="text-xs text-gray-400">{file.size}</div>
                  </div>
                  
                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="p-2 text-blue-400 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                    disabled={loading}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteFile(file)}
                    className="p-2 text-red-500 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm">
                {user?.email?.[0].toUpperCase()}
              </div>
              <span className="text-sm text-gray-400 truncate">{user?.email}</span>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0 ml-2"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div 
        className="flex-1 flex flex-col bg-black relative w-full min-h-0"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        ref={chatAreaRef}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-dashed border-white/50 rounded-lg m-2">
            <div className="text-center px-4">
              <Upload className="w-16 h-16 text-white mx-auto mb-4 animate-bounce" />
              <p className="text-xl lg:text-2xl font-bold text-white">Drop files here</p>
              <p className="text-gray-300 mt-2 text-sm">PDF, Word, Excel, Text (Max 10 MB)</p>
            </div>
          </div>
        )}

        {uploadProgress.length > 0 && (
          <div className="absolute top-4 right-4 bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-2xl z-40 min-w-[280px] max-w-[calc(100vw-2rem)]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-white text-sm">Uploading...</span>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            </div>
            {uploadProgress.map((file, i) => (
              <div key={i} className="mb-2 last:mb-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300 truncate max-w-[180px]">{file.name}</span>
                  <span className="text-gray-400">{file.progress}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${file.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-black border-b border-gray-800 px-4 lg:px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>

            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-black" />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <h1 className="text-lg lg:text-xl font-bold text-white truncate">AI Assistant</h1>
              <p className="text-xs lg:text-sm text-gray-500 truncate">Ask anything about your files</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-8 lg:py-12 px-4">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6 border border-gray-800">
                <Sparkles className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-2 lg:mb-3">
                AI Document Assistant
              </h2>
              <p className="text-gray-500 mb-6 lg:mb-8 text-sm lg:text-base">
                Upload files and get instant insights
              </p>
              <div className="grid grid-cols-1 gap-3 text-left">
                <div className="p-3 lg:p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                  <p className="text-xs lg:text-sm text-gray-400">💡 Drag & drop files anywhere</p>
                </div>
                <div className="p-3 lg:p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                  <p className="text-xs lg:text-sm text-gray-400">📋 Paste files with Ctrl+V</p>
                </div>
                <div className="p-3 lg:p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                  <p className="text-xs lg:text-sm text-gray-400">📤 Upload multiple files at once</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4 lg:space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 lg:gap-4 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  } animate-fade-in`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 lg:w-8 lg:h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-black" />
                    </div>
                  )}
                  <div
                    className={`max-w-[90%] sm:max-w-[85%] lg:max-w-[80%] rounded-2xl px-4 py-3 lg:px-6 lg:py-4 ${
                      msg.role === 'user'
                        ? 'bg-white text-black'
                        : 'bg-gray-900 text-white border border-gray-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed text-sm lg:text-base break-words">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 lg:w-8 lg:h-8 bg-white text-black rounded-lg flex items-center justify-center font-bold flex-shrink-0 text-xs lg:text-sm">
                      {user?.email?.[0].toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-gray-800 bg-black px-3 py-3 lg:px-4 lg:py-4 safe-bottom">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your documents..."
                className="flex-1 px-4 py-3.5 bg-gray-900 text-white border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-white placeholder-gray-600"
                style={{ fontSize: '16px' }}
                disabled={loading}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-12 h-12 lg:w-14 lg:h-14 bg-white text-black rounded-xl hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-600 transition-all flex items-center justify-center flex-shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 lg:w-6 lg:h-6" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

