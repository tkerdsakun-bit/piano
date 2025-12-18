'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import React, { useState } from 'react'
import { Upload, Send, FileText, Loader2, Trash2, Sparkles, Database, LogOut, Download, X, AlertCircle, CheckCircle, Menu, Key, Settings, Folder } from 'lucide-react'

// AI Provider configurations with models
const AI_PROVIDERS = {
  perplexity: {
    name: 'Perplexity',
    icon: '🔮',
    models: [
      { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small (Online)' },
      { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large (Online)' },
      { id: 'llama-3.1-sonar-huge-128k-online', name: 'Sonar Huge (Online)' }
    ],
    apiKeyUrl: 'https://www.perplexity.ai/settings/api'
  },
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
    ],
    apiKeyUrl: 'https://platform.openai.com/api-keys'
  },
  gemini: {
    name: 'Google Gemini',
    icon: '✨',
    models: [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B' }
    ],
    apiKeyUrl: 'https://makersuite.google.com/app/apikey'
  },
  huggingface: {
    name: 'Hugging Face',
    icon: '🤗',
    models: [
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B' },
      { id: 'meta-llama/Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B' },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B' }
    ],
    apiKeyUrl: 'https://huggingface.co/settings/tokens'
  },
  deepseek: {
    name: 'DeepSeek',
    icon: '🧠',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' }
    ],
    apiKeyUrl: 'https://platform.deepseek.com/api_keys'
  }
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

  // Enhanced BYOK States
  const [userApiKey, setUserApiKey] = useState('')
  const [useOwnKey, setUseOwnKey] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKeyInputTemp, setApiKeyInputTemp] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('perplexity')
  const [selectedModel, setSelectedModel] = useState('')

  const chatAreaRef = useRef(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

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

  // Load API Key and settings from localStorage
  useEffect(() => {
    if (user) {
      const savedKey = localStorage.getItem(`ai_api_key_${user.id}`)
      const savedProvider = localStorage.getItem(`ai_provider_${user.id}`)
      const savedModel = localStorage.getItem(`ai_model_${user.id}`)
      const savedPref = localStorage.getItem(`use_own_key_${user.id}`)

      if (savedKey) {
        setUserApiKey(savedKey)
        setApiKeyInputTemp(savedKey)
      }
      if (savedProvider) {
        setSelectedProvider(savedProvider)
      }
      if (savedModel) {
        setSelectedModel(savedModel)
      } else if (savedProvider && AI_PROVIDERS[savedProvider]) {
        setSelectedModel(AI_PROVIDERS[savedProvider].models[0].id)
      }
      if (savedPref === 'true') {
        setUseOwnKey(true)
      }
    }
  }, [user])

  const saveApiKey = () => {
    if (!apiKeyInputTemp.trim()) {
      showNotification('กรุณากรอก API Key', 'error')
      return
    }
    if (apiKeyInputTemp.length < 20) {
      showNotification('API Key ไม่ถูกต้อง', 'error')
      return
    }
    if (!selectedModel) {
      showNotification('กรุณาเลือก Model', 'error')
      return
    }

    localStorage.setItem(`ai_api_key_${user.id}`, apiKeyInputTemp.trim())
    localStorage.setItem(`ai_provider_${user.id}`, selectedProvider)
    localStorage.setItem(`ai_model_${user.id}`, selectedModel)
    localStorage.setItem(`use_own_key_${user.id}`, 'true')

    setUserApiKey(apiKeyInputTemp.trim())
    setUseOwnKey(true)
    setShowApiKeyModal(false)
    showNotification(`✅ บันทึก ${AI_PROVIDERS[selectedProvider].name} API Key สำเร็จ!`, 'success')
  }

  const clearApiKey = () => {
    localStorage.removeItem(`ai_api_key_${user.id}`)
    localStorage.removeItem(`ai_provider_${user.id}`)
    localStorage.removeItem(`ai_model_${user.id}`)
    localStorage.removeItem(`use_own_key_${user.id}`)
    setUserApiKey('')
    setApiKeyInputTemp('')
    setUseOwnKey(false)
    setShowApiKeyModal(false)
    showNotification('ลบ API Key แล้ว', 'info')
  }

  const handleProviderChange = (provider) => {
    setSelectedProvider(provider)
    setSelectedModel(AI_PROVIDERS[provider].models[0].id)
  }

  const toggleUseOwnKey = () => {
    if (!useOwnKey && !userApiKey) {
      setShowApiKeyModal(true)
      return
    }
    const newValue = !useOwnKey
    setUseOwnKey(newValue)
    localStorage.setItem(`use_own_key_${user.id}`, newValue.toString())
    showNotification(
      newValue ? '✅ ใช้ API Key ของคุณ' : 'ใช้ API Key ของระบบ',
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
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file
    const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB total

    // Calculate total size
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
      let failCount = 0

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]

        if (file.size > MAX_FILE_SIZE) {
          showNotification(`${file.name} ใหญ่เกิน 10 MB`, 'error')
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
              'Authorization': `Bearer ${session.access_token}`
            },
            body: formData
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Upload failed')
          }

          setUploadProgress(prev =>
            prev.map(p =>
              p.name === file.name ? { ...p, progress: 100 } : p
            )
          )
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
        showNotification(
          `✅ อัปโหลดสำเร็จ ${successCount}/${fileArray.length} ไฟล์`,
          'success'
        )
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
        setShowApiKeyModal(true)
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-200 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="flex h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
    >
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`
            backdrop-blur-xl rounded-2xl p-4 shadow-2xl border flex items-center gap-3 min-w-[280px]
            ${notification.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50' : ''}
            ${notification.type === 'error' ? 'bg-red-500/20 border-red-500/50' : ''}
            ${notification.type === 'info' ? 'bg-blue-500/20 border-blue-500/50' : ''}
          `}>
            {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            {notification.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-400" />}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-purple-600/30 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="text-center p-8 bg-slate-900/90 rounded-3xl border-4 border-dashed border-purple-400 shadow-2xl">
            <Upload className="w-20 h-20 text-purple-400 mx-auto mb-4 animate-bounce" />
            <p className="text-2xl font-bold text-purple-200">Drop files here</p>
            <p className="text-purple-400 mt-2">PDF, Word, Excel, Text (Max 10 MB)</p>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - Files */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-80 bg-slate-900/50 backdrop-blur-xl border-r border-purple-500/30
        flex flex-col overflow-hidden
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/40 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              <h2 className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Documents
              </h2>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-purple-500/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Upload Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-4 py-2.5 rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/50"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">Upload Files</span>
            </button>

            <button
              onClick={() => folderInputRef.current?.click()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-4 py-2.5 rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/50"
            >
              <Folder className="w-4 h-4" />
              <span className="text-sm font-medium">Upload Folder</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
          />

          <input
            ref={folderInputRef}
            type="file"
            multiple
            webkitdirectory=""
            directory=""
            onChange={handleFolderUpload}
            className="hidden"
          />

          <p className="text-xs text-purple-300/60 mt-2 text-center">
            Max 10 MB per file • 50 MB total
          </p>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent">
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
              <p className="text-purple-400/60 text-sm">No files yet</p>
              <p className="text-purple-500/40 text-xs mt-1">Upload files to start</p>
            </div>
          ) : (
            uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="group bg-slate-800/40 backdrop-blur-sm hover:bg-slate-800/60 rounded-xl p-3 border border-purple-500/20 hover:border-purple-500/40 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-purple-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-purple-400/60 mt-1">{file.size}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="p-1.5 hover:bg-blue-500/20 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file)}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upload Progress */}
        {uploadProgress.length > 0 && (
          <div className="p-4 border-t border-purple-500/30 bg-slate-900/60">
            <p className="text-xs text-purple-400 mb-2 font-medium">Uploading...</p>
            {uploadProgress.map((item, idx) => (
              <div key={idx} className="mb-2">
                <p className="text-xs text-purple-300 truncate mb-1">{item.name}</p>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-slate-900/50 backdrop-blur-xl border-b border-purple-500/30 p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-purple-500/20 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5 text-purple-400" />
            </button>
            <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                AI Document Chat
              </h1>
              <p className="text-xs text-purple-400/60">
                {useOwnKey && userApiKey
                  ? `🔑 Using your ${AI_PROVIDERS[selectedProvider].name} key`
                  : '🤖 Using system API'}
                {selectedModel && ` • ${AI_PROVIDERS[selectedProvider].models.find(m => m.id === selectedModel)?.name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="p-2 hover:bg-purple-500/20 rounded-xl transition-all hover:scale-110"
              title="API Settings"
            >
              <Settings className="w-5 h-5 text-purple-400" />
            </button>
            <button
              onClick={toggleUseOwnKey}
              className={`p-2 rounded-xl transition-all hover:scale-110 ${
                useOwnKey ? 'bg-purple-600/30 text-purple-300' : 'hover:bg-slate-700/50 text-purple-500/60'
              }`}
              title={useOwnKey ? 'Using your API key' : 'Using system API'}
            >
              <Key className="w-5 h-5" />
            </button>
            <button
              onClick={signOut}
              className="p-2 hover:bg-red-500/20 rounded-xl transition-all hover:scale-110"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-red-400" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div
          ref={chatAreaRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/20">
                  <Sparkles className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-purple-200 mb-3">
                  Upload files and get instant insights
                </h3>
                <div className="space-y-2 text-sm text-purple-400/80">
                  <p>💡 Drag & drop files anywhere</p>
                  <p>📋 Paste files with Ctrl+V</p>
                  <p>📁 Upload entire folders at once</p>
                  <p>📤 Upload multiple files</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-slate-800/60 backdrop-blur-sm text-purple-100 border border-purple-500/20'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-purple-500/30 bg-slate-900/50 backdrop-blur-xl">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your documents..."
              disabled={loading}
              className="flex-1 bg-slate-800/60 backdrop-blur-sm text-white px-4 py-3 rounded-xl border border-purple-500/30 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none disabled:opacity-50 placeholder-purple-400/40 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-purple-500/50 flex items-center gap-2"
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

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-6 max-w-2xl w-full border border-purple-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  API Settings
                </h2>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-purple-400" />
              </button>
            </div>

            {/* Provider Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-purple-300 mb-3">
                Select AI Provider
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                  <button
                    key={key}
                    onClick={() => handleProviderChange(key)}
                    className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                      selectedProvider === key
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-purple-500/20 bg-slate-800/40 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="text-2xl mb-2">{provider.icon}</div>
                    <div className="text-sm font-medium text-purple-200">{provider.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-purple-300 mb-2">
                Select Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-slate-800/60 text-white px-4 py-3 rounded-xl border border-purple-500/30 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none"
              >
                {AI_PROVIDERS[selectedProvider].models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-purple-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKeyInputTemp}
                onChange={(e) => setApiKeyInputTemp(e.target.value)}
                placeholder={`Enter your ${AI_PROVIDERS[selectedProvider].name} API Key`}
                className="w-full bg-slate-800/60 text-white px-4 py-3 rounded-xl border border-purple-500/30 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none placeholder-purple-400/40"
              />
              <p className="text-xs text-purple-400/60 mt-2">
                🔒 Stored locally in your browser only
              </p>
            </div>

            {/* API Key URL */}
            <div className="mb-6 p-4 bg-purple-500/10 rounded-xl border border-purple-500/30">
              <p className="text-sm text-purple-300 mb-2">Where to get your API key:</p>
              <a
                href={AI_PROVIDERS[selectedProvider].apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-400 hover:text-purple-300 underline break-all"
              >
                {AI_PROVIDERS[selectedProvider].apiKeyUrl}
              </a>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={saveApiKey}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-xl transition-all hover:scale-105 font-medium shadow-lg"
              >
                Save API Key
              </button>
              {userApiKey && (
                <button
                  onClick={clearApiKey}
                  className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all border border-red-500/30"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{\`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thumb-purple-500\/50::-webkit-scrollbar-thumb {
          background-color: rgba(168, 85, 247, 0.5);
          border-radius: 3px;
        }

        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background-color: transparent;
        }
      \`}</style>
    </div>
  )
}
