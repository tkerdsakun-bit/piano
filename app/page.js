page_js_content = """'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import React, { useState } from 'react'
import { Upload, Send, FileText, Loader2, Trash2, Sparkles, Database, LogOut, Download, X, AlertCircle, CheckCircle, Menu, Key, Settings } from 'lucide-react'

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
  
  // 🆕 BYOK States
  const [userApiKey, setUserApiKey] = useState('')
  const [useOwnKey, setUseOwnKey] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKeyInputTemp, setApiKeyInputTemp] = useState('')
  
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
      document.documentElement.style.setProperty('--vh', \`\${vh}px\`)
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

  // 🆕 Load API Key from localStorage
  useEffect(() => {
    if (user) {
      const savedKey = localStorage.getItem(\`hf_api_key_\${user.id}\`)
      const savedPref = localStorage.getItem(\`use_own_key_\${user.id}\`)
      if (savedKey) {
        setUserApiKey(savedKey)
        setApiKeyInputTemp(savedKey)
      }
      if (savedPref === 'true') {
        setUseOwnKey(true)
      }
    }
  }, [user])

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
        size: \`\${(file.file_size / 1024).toFixed(2)} KB\`,
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

  // 🆕 API Key Management Functions
  const saveApiKey = () => {
    if (!apiKeyInputTemp.trim()) {
      showNotification('กรุณากรอก API Key', 'error')
      return
    }
    if (apiKeyInputTemp.length < 20) {
      showNotification('API Key ไม่ถูกต้อง', 'error')
      return
    }
    localStorage.setItem(\`hf_api_key_\${user.id}\`, apiKeyInputTemp.trim())
    localStorage.setItem(\`use_own_key_\${user.id}\`, 'true')
    setUserApiKey(apiKeyInputTemp.trim())
    setUseOwnKey(true)
    setShowApiKeyModal(false)
    showNotification('✅ บันทึก API Key สำเร็จ!', 'success')
  }

  const clearApiKey = () => {
    localStorage.removeItem(\`hf_api_key_\${user.id}\`)
    localStorage.removeItem(\`use_own_key_\${user.id}\`)
    setUserApiKey('')
    setApiKeyInputTemp('')
    setUseOwnKey(false)
    setShowApiKeyModal(false)
    showNotification('ลบ API Key แล้ว', 'info')
  }

  const toggleUseOwnKey = () => {
    if (!useOwnKey && !userApiKey) {
      setShowApiKeyModal(true)
      return
    }
    const newValue = !useOwnKey
    setUseOwnKey(newValue)
    localStorage.setItem(\`use_own_key_\${user.id}\`, newValue.toString())
    showNotification(
      newValue ? '✅ ใช้ API Key ของคุณ' : 'ใช้ API Key ของระบบ',
      'success'
    )
  }

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    const MAX_FILE_SIZE = 10 * 1024 * 1024
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
          showNotification(\`\${file.name} ใหญ่เกิน 10 MB\`, 'error')
          failCount++
          continue
        }

        setUploadProgress(prev => [...prev, { name: file.name, progress: 0 }])

        try {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': \`Bearer \${session.access_token}\`
            },
            body: formData
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Upload failed')
          }

          setUploadProgress(prev => prev.map(p => 
            p.name === file.name ? { ...p, progress: 100 } : p
          ))
          successCount++
        } catch (error) {
          console.error(\`Upload error for \${file.name}:\`, error)
          showNotification(\`\${file.name}: \${error.message}\`, 'error')
          setUploadProgress(prev => prev.filter(p => p.name !== file.name))
          failCount++
        }
      }

      if (successCount > 0) {
        await loadUserFiles()
        showNotification(\`✅ อัปโหลดสำเร็จ \${successCount}/\${fileArray.length} ไฟล์\`, 'success')
        setIsSidebarOpen(false)
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
      showNotification(\`กำลังดาวน์โหลด \${file.name}\`, 'success')
    } catch (error) {
      console.error('Download error:', error)
      showNotification('ดาวน์โหลดไม่สำเร็จ', 'error')
    }
  }

  const handleDeleteFile = async (file) => {
    if (!confirm(\`ต้องการลบ \${file.name} ใช่หรือไม่?\`)) return
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
      showNotification(\`ลบ \${file.name} สำเร็จ\`, 'success')
    } catch (error) {
      console.error('Delete error:', error)
      showNotification('ลบไฟล์ไม่สำเร็จ', 'error')
    } finally {
      setLoading(false)
    }
  }

  // 🆕 Modified Send Message with BYOK support
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fileContents = uploadedFiles.map(f => ({ name: f.name, content: f.content }))

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${session.access_token}\`
      }

      // 🆕 Add user's API key if they're using their own
      if (useOwnKey && userApiKey) {
        headers['X-User-API-Key'] = userApiKey
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ 
          message: userMessage, 
          fileContents,
          useOwnKey: useOwnKey && !!userApiKey
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      console.error('Chat error:', error)
      let errorMessage = 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
      
      if (error.message.includes('API key')) {
        errorMessage = '❌ API Key ไม่ถูกต้อง กรุณาตรวจสอบ API Key ของคุณ'
        setShowApiKeyModal(true)
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }])
      showNotification('ส่งข้อความไม่สำเร็จ', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="flex h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 overflow-hidden"
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 🆕 API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowApiKeyModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Key className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">ตั้งค่า API Key</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hugging Face API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInputTemp}
                  onChange={(e) => setApiKeyInputTemp(e.target.value)}
                  placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-2">
                  🔒 API Key จะถูกเก็บไว้ในเครื่องของคุณเท่านั้น
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>วิธีรับ API Key:</strong>
                </p>
                <ol className="text-xs text-blue-700 space-y-1 ml-4 list-decimal">
                  <li>ไปที่ <a href="https://huggingface.co/settings/tokens" target="_blank" className="underline">huggingface.co/settings/tokens</a></li>
                  <li>คลิก "New token"</li>
                  <li>ตั้งชื่อและเลือก "Read" permission</li>
                  <li>คัดลอก token มาวางที่นี่</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={clearApiKey}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors"
                >
                  ล้าง Key
                </button>
                <button
                  onClick={saveApiKey}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg font-medium transition-all"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={\`\${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 w-80 bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col h-full\`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-white" />
              <h2 className="text-xl font-bold text-white">เอกสารของคุณ</h2>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white hover:text-gray-200">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* 🆕 API Key Status */}
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white font-medium">ใช้ API Key ของคุณ</span>
              <button
                onClick={toggleUseOwnKey}
                className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors \${useOwnKey ? 'bg-green-500' : 'bg-gray-300'}\`}
              >
                <span className={\`inline-block h-4 w-4 transform rounded-full bg-white transition-transform \${useOwnKey ? 'translate-x-6' : 'translate-x-1'}\`} />
              </button>
            </div>
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white bg-opacity-30 hover:bg-opacity-40 rounded-lg text-white text-sm font-medium transition-all"
            >
              <Settings className="w-4 h-4" />
              {userApiKey ? 'แก้ไข API Key' : 'ตั้งค่า API Key'}
            </button>
          </div>

          <label className="mt-4 block cursor-pointer">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
            />
            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-purple-600 rounded-xl hover:shadow-lg transition-all font-medium">
              <Upload className="w-5 h-5" />
              อัปโหลดไฟล์
            </div>
          </label>

          {uploadProgress.length > 0 && (
            <div className="mt-3 space-y-2">
              {uploadProgress.map((file, idx) => (
                <div key={idx} className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-2">
                  <div className="flex items-center gap-2 text-white text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="truncate flex-1">{file.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-4">
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-sm">ยังไม่มีไฟล์</p>
              <p className="text-xs mt-2">อัปโหลดไฟล์เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 hover:shadow-md transition-all border border-purple-100">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{file.size}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-xs font-medium"
                    >
                      <Download className="w-4 h-4" />
                      ดาวน์โหลด
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user.email}</p>
              <p className="text-xs text-gray-500">Max 10 MB per file</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="bg-white shadow-md p-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI Chatbot
              </h1>
              <p className="text-xs text-gray-500">
                {useOwnKey && userApiKey ? '🔑 ใช้ API Key ของคุณ' : '🤖 ใช้ API Key ของระบบ'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <div className="text-right mr-2">
              <p className="text-sm font-medium text-gray-800">{user.email}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {user.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div ref={chatAreaRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <Sparkles className="w-20 h-20 mx-auto mb-6 text-purple-400 opacity-50" />
                <h2 className="text-2xl font-bold text-gray-800 mb-3">ถามอะไรก็ได้เกี่ยวกับไฟล์ของคุณ</h2>
                <p className="text-gray-600 mb-6">อัปโหลดไฟล์และรับข้อมูลเชิงลึกทันที</p>
                <div className="grid gap-3 text-left">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
                    <p className="text-sm text-gray-700">💡 Drag & drop files anywhere</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
                    <p className="text-sm text-gray-700">📋 Paste files with Ctrl+V</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
                    <p className="text-sm text-gray-700">📤 Upload multiple files at once</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={\`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}\`}>
                  <div className={\`max-w-[80%] rounded-2xl px-4 py-3 \${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'bg-white shadow-md border border-gray-200 text-gray-800'
                  }\`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white shadow-md border border-gray-200 rounded-2xl px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์ข้อความของคุณ..."
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              ส่ง
            </button>
          </form>
        </div>

        {/* Drag & Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-purple-600 bg-opacity-90 flex items-center justify-center z-30 backdrop-blur-sm">
            <div className="text-center text-white">
              <Upload className="w-20 h-20 mx-auto mb-4 animate-bounce" />
              <p className="text-2xl font-bold mb-2">วางไฟล์ที่นี่</p>
              <p className="text-sm opacity-90">PDF, Word, Excel, Text (Max 10 MB)</p>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={\`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl \${
            notification.type === 'success' ? 'bg-green-500' :
            notification.type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
          } text-white\`}>
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-medium">{notification.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
