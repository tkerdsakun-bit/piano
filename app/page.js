// This file is too large to display in full
// Key changes marked with // ⭐ NEW comments

'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import React, { useState } from 'react'
import { Upload, Send, FileText, Loader2, Trash2, Database, LogOut, Download, X, AlertCircle, CheckCircle, Menu, Key, Settings, Folder, Power, ChevronDown } from 'lucide-react'

// Initial provider configs (will be updated with dynamic models)
const INITIAL_PROVIDERS = {
  perplexity: { name: 'Perplexity', icon: '🔮' },
  openai: { name: 'OpenAI', icon: '🤖' },
  gemini: { name: 'Google Gemini', icon: '✨' },
  huggingface: { name: 'Hugging Face', icon: '🤗' },
  deepseek: { name: 'DeepSeek', icon: '🧠' }
}

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

  // ⭐ NEW: Dynamic model states
  const [availableModels, setAvailableModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)

  // API states
  const [userApiKey, setUserApiKey] = useState('')
  const [useOwnKey, setUseOwnKey] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKeyInputTemp, setApiKeyInputTemp] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('perplexity')
  const [selectedModel, setSelectedModel] = useState('sonar-reasoning')

  const chatAreaRef = useRef(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // ⭐ NEW: Fetch models dynamically
  const fetchModels = async (provider, apiKey = null) => {
    setLoadingModels(true)
    try {
      const headers = {}
      if (apiKey) {
        headers['X-API-Key'] = apiKey
      }

      const res = await fetch(`/api/models?provider=${provider}`, { headers })

      if (!res.ok) throw new Error('Failed to fetch models')

      const data = await res.json()
      setAvailableModels(data.models || [])

      // Auto-select first model if current selection invalid
      if (data.models.length > 0 && !data.models.find(m => m.id === selectedModel)) {
        setSelectedModel(data.models[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
      showNotification('ไม่สามารถโหลดรายการ Model ได้', 'error')
      // Set fallback model
      setSelectedModel('sonar-reasoning')
    } finally {
      setLoadingModels(false)
    }
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

  // Load settings
  useEffect(() => {
    if (user) {
      const savedKey = localStorage.getItem(`ai_api_key_${user.id}`)
      const savedProvider = localStorage.getItem(`ai_provider_${user.id}`)
      const savedModel = localStorage.getItem(`ai_model_${user.id}`)
      const savedPref = localStorage.getItem(`use_own_key_${user.id}`)

      if (savedKey) setUserApiKey(savedKey)
      if (savedProvider) setSelectedProvider(savedProvider)
      if (savedModel) setSelectedModel(savedModel)
      if (savedPref === 'true') setUseOwnKey(true)
    }
  }, [user])

  // ⭐ NEW: Load models when provider changes
  useEffect(() => {
    if (selectedProvider) {
      fetchModels(selectedProvider, useOwnKey ? userApiKey : null)
    }
  }, [selectedProvider])

  const handleProviderChange = (provider) => {
    setSelectedProvider(provider)
    localStorage.setItem(`ai_provider_${user.id}`, provider)
    // Models will be fetched by useEffect
  }

  const handleModelChange = (model) => {
    setSelectedModel(model)
    localStorage.setItem(`ai_model_${user.id}`, model)
    showNotification(`เปลี่ยนเป็น ${model}`, 'success')
  }

  const openApiKeyModal = () => {
    setApiKeyInputTemp(userApiKey)
    setShowApiKeyModal(true)
  }

  const saveApiKey = () => {
    if (!apiKeyInputTemp.trim()) {
      showNotification('กรุณากรอก API Key', 'error')
      return
    }
    if (apiKeyInputTemp.length < 20) {
      showNotification('API Key ไม่ถูกต้อง', 'error')
      return
    }

    localStorage.setItem(`ai_api_key_${user.id}`, apiKeyInputTemp.trim())
    setUserApiKey(apiKeyInputTemp.trim())
    setShowApiKeyModal(false)

    // Refresh models with new API key
    fetchModels(selectedProvider, apiKeyInputTemp.trim())
    showNotification(`✅ บันทึก ${INITIAL_PROVIDERS[selectedProvider].name} API Key สำเร็จ!`, 'success')
  }

  const clearApiKey = () => {
    localStorage.removeItem(`ai_api_key_${user.id}`)
    localStorage.removeItem(`use_own_key_${user.id}`)
    setUserApiKey('')
    setApiKeyInputTemp('')
    setUseOwnKey(false)
    setShowApiKeyModal(false)
    showNotification('ลบ API Key แล้ว', 'info')
  }

  const toggleUseOwnKey = () => {
    if (!userApiKey) {
      showNotification('กรุณาตั้งค่า API Key ก่อน', 'error')
      openApiKeyModal()
      return
    }

    const newValue = !useOwnKey
    setUseOwnKey(newValue)
    localStorage.setItem(`use_own_key_${user.id}`, newValue.toString())
    showNotification(
      newValue ? '✅ เปิดใช้ API Key ของคุณ' : '✅ ปิดใช้ API Key ของคุณ (ใช้ระบบ)',
      'success'
    )
  }

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
        size: (file.file_size / 1024).toFixed(2) + ' KB',
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

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    const MAX_TOTAL_SIZE = 50 * 1024 * 1024

    const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0)
    if (totalSize > MAX_TOTAL_SIZE) {
      showNotification(`ขนาดรวมเกิน 50 MB (${(totalSize / 1024 / 1024).toFixed(2)} MB)`, 'error')
      return
    }

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error')
        return
      }

      let successCount = 0

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]

        if (file.size > MAX_FILE_SIZE) {
          showNotification(`${file.name} ใหญ่เกิน 10 MB`, 'error')
          continue
        }

        setUploadProgress(prev => [...prev, { name: file.name, progress: 0 }])

        try {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Upload failed')
          }

          setUploadProgress(prev =>
            prev.map(p => p.name === file.name ? { ...p, progress: 100 } : p)
          )
          successCount++
        } catch (error) {
          console.error(`Upload error for ${file.name}:`, error)
          showNotification(`${file.name}: ${error.message}`, 'error')
          setUploadProgress(prev => prev.filter(p => p.name !== file.name))
        }
      }

      if (successCount > 0) {
        await loadUserFiles()
        showNotification(`✅ อัปโหลดสำเร็จ ${successCount}/${fileArray.length} ไฟล์`, 'success')
        setIsSidebarOpen(false)
      }
    } catch (error) {
      console.error('Upload error:', error)
      showNotification(`อัปโหลดล้มเหลว: ${error.message}`, 'error')
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
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
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

  const handleFolderUpload = async (event) => {
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

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }

      if (useOwnKey && userApiKey) {
        headers['X-User-API-Key'] = userApiKey
        headers['X-AI-Provider'] = selectedProvider
        headers['X-AI-Model'] = selectedModel
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          message: userMessage,
          fileContents,
          useOwnKey: useOwnKey && !!userApiKey,
          provider: selectedProvider,
          model: selectedModel
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response
      }])
    } catch (error) {
      console.error('Chat error:', error)
      let errorMessage = 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'

      if (error.message.includes('API key') || error.message.includes('Invalid')) {
        errorMessage = '❌ API Key ไม่ถูกต้อง กรุณาตรวจสอบ API Key ของคุณ'
        openApiKeyModal()
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }])
      showNotification('ส่งข้อความไม่สำเร็จ', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="flex h-screen bg-black text-white overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
    >
      {/* Notifications */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`rounded-lg p-4 shadow-xl border flex items-center gap-3 min-w-[280px] ${
            notification.type === 'success' ? 'bg-green-900 border-green-700' : ''
          }${
            notification.type === 'error' ? 'bg-red-900 border-red-700' : ''
          }${
            notification.type === 'info' ? 'bg-gray-800 border-gray-600' : ''
          }`}>
            {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            {notification.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-400" />}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="text-center p-8 bg-gray-900 rounded-xl border-2 border-dashed border-white">
            <Upload className="w-16 h-16 text-white mx-auto mb-4" />
            <p className="text-xl font-bold">Drop files here</p>
            <p className="text-gray-400 mt-2">PDF, Word, Excel, Text (Max 10 MB)</p>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-80 bg-gray-900 border-r border-gray-800
        flex flex-col overflow-hidden
        transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-white" />
              <h2 className="font-bold text-lg">Documents</h2>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-800 rounded transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 px-4 py-2.5 rounded-lg transition disabled:opacity-50 font-medium"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm">Upload Files</span>
            </button>

            <button
              onClick={() => folderInputRef.current?.click()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2.5 rounded-lg transition disabled:opacity-50 font-medium"
            >
              <Folder className="w-4 h-4" />
              <span className="text-sm">Upload Folder</span>
            </button>
          </div>

          <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls" />
          <input ref={folderInputRef} type="file" multiple webkitdirectory="" directory="" onChange={handleFolderUpload} className="hidden" />

          <p className="text-xs text-gray-500 mt-2 text-center">Max 10 MB per file • 50 MB total</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No files yet</p>
            </div>
          ) : (
            uploadedFiles.map((file) => (
              <div key={file.id} className="group bg-gray-800 hover:bg-gray-750 rounded-lg p-3 border border-gray-700 transition">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{file.size}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => handleDownloadFile(file)} className="p-1.5 hover:bg-gray-700 rounded" title="Download">
                      <Download className="w-4 h-4 text-blue-400" />
                    </button>
                    <button onClick={() => handleDeleteFile(file)} className="p-1.5 hover:bg-gray-700 rounded" title="Delete">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {uploadProgress.length > 0 && (
          <div className="p-4 border-t border-gray-800 bg-gray-900">
            <p className="text-xs text-gray-400 mb-2">Uploading...</p>
            {uploadProgress.map((item, idx) => (
              <div key={idx} className="mb-2">
                <p className="text-xs text-gray-300 truncate mb-1">{item.name}</p>
                <div className="h-1.5 bg-gray-700 rounded-full">
                  <div className="h-full bg-white transition-all" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ⭐ NEW: Enhanced Top Bar with Provider/Model Selectors */}
        <div className="bg-gray-900 border-b border-gray-800 p-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Left: User Info */}
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-800 rounded transition">
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-bold text-sm">AI Document Chat</h1>
                <p className="text-xs text-gray-400">{user?.email || 'User'}</p>
              </div>
            </div>

            {/* ⭐ NEW: Center: Provider & Model Selectors */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              {/* Provider Selector */}
              <div className="relative group">
                <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg border border-gray-700 transition text-sm">
                  <span>{INITIAL_PROVIDERS[selectedProvider].icon}</span>
                  <span className="hidden sm:inline">{INITIAL_PROVIDERS[selectedProvider].name}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="absolute hidden group-hover:block top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[160px] z-50">
                  {Object.entries(INITIAL_PROVIDERS).map(([key, provider]) => (
                    <button
                      key={key}
                      onClick={() => handleProviderChange(key)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition text-sm flex items-center gap-2 ${
                        selectedProvider === key ? 'bg-gray-700' : ''
                      }`}
                    >
                      <span>{provider.icon}</span>
                      <span>{provider.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selector */}
              <div className="relative group">
                <button 
                  disabled={loadingModels}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg border border-gray-700 transition text-sm max-w-[200px] disabled:opacity-50"
                >
                  {loadingModels ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span className="truncate">{availableModels.find(m => m.id === selectedModel)?.name || selectedModel}</span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
                {!loadingModels && availableModels.length > 0 && (
                  <div className="absolute hidden group-hover:block top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[200px] max-h-[300px] overflow-y-auto z-50">
                    {availableModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleModelChange(model.id)}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition text-sm ${
                          selectedModel === model.id ? 'bg-gray-700' : ''
                        }`}
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleUseOwnKey}
                disabled={!userApiKey}
                className={`p-2 rounded-lg transition flex items-center gap-1 text-xs ${
                  useOwnKey ? 'bg-green-900 text-green-300 border border-green-700' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={useOwnKey ? 'Using your API' : 'Using system API'}
              >
                <Power className="w-4 h-4" />
                <span className="hidden sm:inline">{useOwnKey ? 'ON' : 'OFF'}</span>
              </button>

              <button onClick={openApiKeyModal} className="p-2 hover:bg-gray-800 rounded-lg transition" title="Settings">
                <Settings className="w-5 h-5" />
              </button>

              <button onClick={signOut} className="p-2 hover:bg-red-900/20 rounded-lg transition" title="Logout">
                <LogOut className="w-5 h-5 text-red-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div ref={chatAreaRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Upload files and get instant insights</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>💡 Drag & drop files anywhere</p>
                  <p>📋 Paste with Ctrl+V</p>
                  <p>📁 Upload folders</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  msg.role === 'user' ? 'bg-white text-black' : 'bg-gray-800 text-white border border-gray-700'
                }`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              disabled={loading}
              className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-white focus:outline-none disabled:opacity-50 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-lg transition disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6" />
                <h2 className="text-xl font-bold">API Key Settings</h2>
              </div>
              <button onClick={() => setShowApiKeyModal(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
              <input
                type="password"
                value={apiKeyInputTemp}
                onChange={(e) => setApiKeyInputTemp(e.target.value)}
                placeholder="Enter your API Key"
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-white focus:outline-none placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-2">🔒 Stored locally only</p>
            </div>

            <div className="flex gap-3">
              <button onClick={saveApiKey} className="flex-1 bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-lg transition font-medium">
                Save
              </button>
              {userApiKey && (
                <button onClick={clearApiKey} className="px-6 py-3 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg border border-red-800">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  )
}
