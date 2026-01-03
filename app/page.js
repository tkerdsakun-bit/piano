'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Menu, FileText, Loader2, Upload, Trash2, X, Settings, Plus, MessageSquare, LogOut, User, Key, Cloud, Download, ChevronDown, ChevronRight, Database, MessageCircle, Globe, Eye, EyeOff } from 'lucide-react'

const PROVIDERS = {
  perplexity: { name: 'Perplexity', icon: '🔮' },
  openai: { name: 'OpenAI', icon: '🤖' },
  gemini: { name: 'Gemini', icon: '✨' },
  huggingface: { name: 'HF', icon: '🤗' },
  deepseek: { name: 'DeepSeek', icon: '🧠' }
}

export default function ChatPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentChatId, setCurrentChatId] = useState(null)
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showFilesDropdown, setShowFilesDropdown] = useState(false)
  const [showDrive, setShowDrive] = useState(false)
  const [settingsTab, setSettingsTab] = useState('account')
  
  // NEW: Collapsible sections state
  const [sectionCollapsed, setSectionCollapsed] = useState({
    chat: false,
    user: false,
    global: false
  })
  
  // Separate file storage by scope
  const [chatFiles, setChatFiles] = useState([])
  const [userFiles, setUserFiles] = useState([])
  const [globalFiles, setGlobalFiles] = useState([])
  
  // NEW: File enabled state (which files are active)
  const [fileEnabled, setFileEnabled] = useState({})
  
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const dropdownRef = useRef(null)
  
  // AI Provider/Model
  const [selectedProvider, setSelectedProvider] = useState('perplexity')
  const [selectedModel, setSelectedModel] = useState('sonar-reasoning-pro')
  const [availableModels, setAvailableModels] = useState([])
  const [useOwnKey, setUseOwnKey] = useState(false)
  const [userApiKey, setUserApiKey] = useState('')
  
  // Settings
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [apiKeys, setApiKeys] = useState({
    perplexity: '',
    openai: '',
    gemini: '',
    huggingface: '',
    deepseek: ''
  })
  
  // Drive links
  const [driveLink, setDriveLink] = useState('')
  const [loadingLink, setLoadingLink] = useState(false)
  const [driveLinkFiles, setDriveLinkFiles] = useState([])
  
  const [notification, setNotification] = useState(null)
  const messagesEndRef = useRef(null)

  const notify = (msg, type = 'info') => {
    setNotification({ message: msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Initialize
  useEffect(() => {
    if (user) {
      const savedKey = localStorage.getItem('key_' + user.id)
      const savedProvider = localStorage.getItem('provider_' + user.id)
      const savedModel = localStorage.getItem('model_' + user.id)
      const savedPref = localStorage.getItem('own_' + user.id)
      
      // Load file enabled state
      const savedFileEnabled = localStorage.getItem('fileEnabled_' + user.id)
      if (savedFileEnabled) {
        setFileEnabled(JSON.parse(savedFileEnabled))
      }
      
      // Load section collapsed state
      const savedCollapsed = localStorage.getItem('sectionCollapsed_' + user.id)
      if (savedCollapsed) {
        setSectionCollapsed(JSON.parse(savedCollapsed))
      }
      
      if (savedKey) setUserApiKey(savedKey)
      if (savedProvider) setSelectedProvider(savedProvider)
      if (savedModel) setSelectedModel(savedModel)
      if (savedPref === 'true') setUseOwnKey(true)
      
      loadUserFiles()
      loadGlobalFiles()
      loadChatsFromStorage(user.id)
      fetchModels(savedProvider || 'perplexity')
    }
  }, [user])

  // Save file enabled state
  useEffect(() => {
    if (user) {
      localStorage.setItem('fileEnabled_' + user.id, JSON.stringify(fileEnabled))
    }
  }, [fileEnabled, user])

  // Save section collapsed state
  useEffect(() => {
    if (user) {
      localStorage.setItem('sectionCollapsed_' + user.id, JSON.stringify(sectionCollapsed))
    }
  }, [sectionCollapsed, user])

  // Load chats and restore chat files from saved state
  useEffect(() => {
    if (user && currentChatId && chats.length > 0) {
      const currentChat = chats.find(c => c.id === currentChatId)
      if (currentChat?.chatFiles) {
        setChatFiles(currentChat.chatFiles)
      } else {
        setChatFiles([])
      }
    }
  }, [currentChatId, chats, user])

  // Save chat files to chat state
  useEffect(() => {
    if (user && currentChatId && chatFiles.length >= 0) {
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, chatFiles: chatFiles }
          : chat
      ))
    }
  }, [chatFiles, currentChatId, user])

  // Initialize new files as enabled by default
  useEffect(() => {
    const allFiles = [...chatFiles, ...userFiles, ...globalFiles]
    const newEnabled = { ...fileEnabled }
    let hasChanges = false
    
    allFiles.forEach(file => {
      if (!(file.id in newEnabled)) {
        newEnabled[file.id] = true
        hasChanges = true
      }
    })
    
    if (hasChanges) {
      setFileEnabled(newEnabled)
    }
  }, [chatFiles, userFiles, globalFiles])

  useEffect(() => {
    if (user && chats.length === 0) {
      const initialChat = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        chatFiles: [],
        createdAt: new Date(),
        userId: user.id
      }
      setChats([initialChat])
      setCurrentChatId(initialChat.id)
    }
  }, [user])

  useEffect(() => {
    if (user && chats.length > 0) {
      saveChatsToStorage(user.id, chats)
    }
  }, [chats, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chats, currentChatId])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowFilesDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchModels = async (provider) => {
    try {
      const res = await fetch('/api/models?provider=' + provider)
      if (res.ok) {
        const data = await res.json()
        setAvailableModels(data.models || [])
        if (data.models.length > 0 && !data.models.find(m => m.id === selectedModel)) {
          setSelectedModel(data.models[0].id)
        }
      }
    } catch (error) {
      console.error('Model fetch:', error)
    }
  }

  const changeProvider = (p) => {
    setSelectedProvider(p)
    localStorage.setItem('provider_' + user.id, p)
    fetchModels(p)
  }

  const changeModel = (m) => {
    setSelectedModel(m)
    localStorage.setItem('model_' + user.id, m)
  }

  const toggleKey = () => {
    if (!userApiKey) {
      notify('Set API Key first', 'error')
      setShowSettings(true)
      setSettingsTab('api')
      return
    }
    const v = !useOwnKey
    setUseOwnKey(v)
    localStorage.setItem('own_' + user.id, v.toString())
    notify(v ? '✓ Your API' : '✓ System API', 'success')
  }

  const saveApiKey = (provider) => {
    if (!apiKeys[provider] || apiKeys[provider].length < 20) {
      notify('Invalid API key', 'error')
      return
    }
    localStorage.setItem(`key_${provider}`, apiKeys[provider])
    if (provider === selectedProvider) {
      setUserApiKey(apiKeys[provider])
      localStorage.setItem('key_' + user.id, apiKeys[provider])
    }
    notify(`${provider} API key saved!`, 'success')
  }

  // NEW: Toggle file enabled/disabled
  const toggleFileEnabled = (fileId) => {
    setFileEnabled(prev => ({
      ...prev,
      [fileId]: !prev[fileId]
    }))
  }

  // NEW: Toggle section collapse
  const toggleSection = (section) => {
    setSectionCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const loadChatsFromStorage = (userId) => {
    try {
      const saved = localStorage.getItem(`chats_${userId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        setChats(parsed)
        if (parsed.length > 0) {
          setCurrentChatId(parsed[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load chats:', error)
    }
  }

  const saveChatsToStorage = (userId, chatsData) => {
    try {
      localStorage.setItem(`chats_${userId}`, JSON.stringify(chatsData))
    } catch (error) {
      console.error('Failed to save chats:', error)
    }
  }

  const currentChat = chats.find(c => c.id === currentChatId)

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      chatFiles: [],
      createdAt: new Date(),
      userId: user.id
    }
    setChats(prev => [newChat, ...prev])
    setCurrentChatId(newChat.id)
    setChatFiles([])
  }

  const deleteChat = (chatId, e) => {
    e?.stopPropagation()
    if (chats.length === 1) return
    
    setChats(prev => prev.filter(c => c.id !== chatId))
    if (currentChatId === chatId) {
      const remaining = chats.filter(c => c.id !== chatId)
      setCurrentChatId(remaining[0]?.id)
    }
  }

  const loadUserFiles = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .eq('scope', 'user')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setUserFiles(data.map(f => ({
        id: f.id,
        name: f.name,
        size: (f.file_size / 1024).toFixed(1) + 'K',
        file_path: f.file_path,
        content: f.content,
        scope: 'user'
      })))
    } catch (error) {
      console.error('Load user files error:', error)
    }
  }

  const loadGlobalFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('scope', 'global')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setGlobalFiles(data.map(f => ({
        id: f.id,
        name: f.name,
        size: (f.file_size / 1024).toFixed(1) + 'K',
        file_path: f.file_path,
        content: f.content,
        scope: 'global',
        uploadedBy: f.user_id
      })))
    } catch (error) {
      console.error('Load global files error:', error)
    }
  }

  const uploadFiles = async (files, scope = 'user') => {
    if (!files || files.length === 0) return
    
    const arr = Array.from(files)
    
    if (scope === 'chat') {
      setLoading(true)
      try {
        for (const file of arr) {
          if (file.size > 10 * 1024 * 1024) {
            notify(file.name + ' too large', 'error')
            continue
          }
          
          const { parseFile } = await import('../lib/fileParser')
          const content = await parseFile(file, file.type)
          
          const chatFile = {
            id: 'chat_' + Date.now() + '_' + Math.random(),
            name: file.name,
            size: (file.size / 1024).toFixed(1) + 'K',
            content: content,
            scope: 'chat'
          }
          
          setChatFiles(prev => [...prev, chatFile])
        }
        notify('✓ Added to chat', 'success')
      } catch (error) {
        notify('Failed to add files', 'error')
      } finally {
        setLoading(false)
      }
      return
    }
    
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        notify('Login first', 'error')
        return
      }
      
      let count = 0
      for (const file of arr) {
        if (file.size > 10 * 1024 * 1024) {
          notify(file.name + ' too large', 'error')
          continue
        }
        
        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('scope', scope)
          
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + session.access_token },
            body: formData
          })
          
          if (!res.ok) throw new Error('Upload failed')
          count++
        } catch (e) {
          console.error(e)
        }
      }
      
      if (count > 0) {
        if (scope === 'user') await loadUserFiles()
        if (scope === 'global') await loadGlobalFiles()
        notify(`✓ ${count} uploaded to ${scope} database`, 'success')
      }
    } catch (error) {
      notify('Upload failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteFile = async (file) => {
    if (!confirm('Delete ' + file.name + '?')) return
    
    try {
      setLoading(true)
      
      if (file.scope === 'chat') {
        setChatFiles(prev => prev.filter(f => f.id !== file.id))
        // Remove from fileEnabled state
        setFileEnabled(prev => {
          const newState = { ...prev }
          delete newState[file.id]
          return newState
        })
        notify('✓ Removed from chat', 'success')
        return
      }
      
      await supabase.storage.from('documents').remove([file.file_path])
      await supabase.from('files').delete().eq('id', file.id).eq('user_id', user.id)
      
      // Remove from fileEnabled state
      setFileEnabled(prev => {
        const newState = { ...prev }
        delete newState[file.id]
        return newState
      })
      
      if (file.scope === 'user') await loadUserFiles()
      if (file.scope === 'global') await loadGlobalFiles()
      
      notify('✓ Deleted', 'success')
    } catch (error) {
      notify('Failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const downloadFile = async (file) => {
    if (file.scope === 'chat') {
      const blob = new Blob([file.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
      return
    }
    
    try {
      const { data, error } = await supabase.storage.from('documents').download(file.file_path)
      if (error) throw error
      
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      notify('Download failed', 'error')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    if (e.currentTarget === e.target) setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files, 'user')
    }
  }

  const fetchDriveLink = async () => {
    if (!driveLink.trim()) {
      notify('Please enter a Google Drive link', 'error')
      return
    }
    
    setLoadingLink(true)
    try {
      const res = await fetch('/api/gdrive/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: driveLink.trim() })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch file')
      }
      
      const data = await res.json()
      setDriveLinkFiles(prev => {
        const exists = prev.find(f => f.fileId === data.file.fileId)
        if (exists) {
          notify('File already added', 'info')
          return prev
        }
        return [...prev, data.file]
      })
      
      setDriveLink('')
      notify(`✓ Added: ${data.file.name}`, 'success')
    } catch (error) {
      notify(error.message || 'Failed to fetch file', 'error')
    } finally {
      setLoadingLink(false)
    }
  }

  const removeDriveLinkFile = (fileId) => {
    setDriveLinkFiles(prev => prev.filter(f => f.fileId !== fileId))
    notify('Removed', 'info')
  }

  // Get all active files (only enabled ones)
  const getAllActiveFiles = () => {
    const allFiles = [
      ...chatFiles.map(f => ({ ...f, enabled: fileEnabled[f.id] !== false })),
      ...userFiles.map(f => ({ ...f, enabled: fileEnabled[f.id] !== false })),
      ...globalFiles.map(f => ({ ...f, enabled: fileEnabled[f.id] !== false })),
      ...driveLinkFiles.map(f => ({ ...f, enabled: true }))
    ]
    
    return allFiles
      .filter(f => f.enabled)
      .map(f => ({ name: f.name, content: f.content }))
  }

  const sendMessage = async (content) => {
    if (!content.trim() || loading) return

    const userMessage = { role: 'user', content: content.trim() }
    
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, userMessage],
            title: chat.messages.length === 0 ? content.slice(0, 30) : chat.title
          }
        : chat
    ))

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const fileContents = getAllActiveFiles()

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }

      if (useOwnKey && userApiKey) {
        headers['X-User-API-Key'] = userApiKey
        headers['X-AI-Provider'] = selectedProvider
        headers['X-AI-Model'] = selectedModel
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: content,
          fileContents,
          useOwnKey: useOwnKey && !!userApiKey,
          provider: selectedProvider,
          model: selectedModel
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send message')
      }

      const data = await res.json()
      const aiMessage = { role: 'assistant', content: data.response }

      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, aiMessage] }
          : chat
      ))

    } catch (error) {
      console.error('Send message error:', error)
      const errorMessage = { 
        role: 'assistant', 
        content: '❌ Error: ' + error.message 
      }
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, errorMessage] }
          : chat
      ))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      notify('Passwords do not match', 'error')
      return
    }
    if (newPassword.length < 6) {
      notify('Password must be at least 6 characters', 'error')
      return
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      
      notify('Password changed successfully!', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      notify('Failed to change password: ' + error.message, 'error')
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-8 h-8 text-black animate-spin" />
      </div>
    )
  }

  const totalFiles = chatFiles.length + userFiles.length + globalFiles.length + driveLinkFiles.length
  const totalActiveFiles = getAllActiveFiles().length

  return (
    <div 
      className="flex h-screen bg-white"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`border rounded-xl px-4 py-2 backdrop-blur-xl ${
            notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' : 
            notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' : 
            'bg-blue-50 border-blue-400 text-blue-800'
          }`}>
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {isDragging && (
        <div className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center">
          <div className="border-2 border-white p-8 rounded-2xl">
            <Upload className="w-16 h-16 mx-auto mb-3 text-white" />
            <p className="text-xl font-bold text-white">Drop Files to User Database</p>
          </div>
        </div>
      )}

      {/* Sidebar - keeping original */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-gray-200 flex flex-col overflow-hidden bg-gray-50`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h1 className="font-semibold text-lg">Chats</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <button onClick={createNewChat} className="w-full flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scroll">
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setCurrentChatId(chat.id)}
              className={`w-full text-left p-3 rounded-lg mb-1 group hover:bg-gray-200 transition-colors ${
                currentChatId === chat.id ? 'bg-white border border-gray-300' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chat.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {chat.messages?.length || 0} messages
                      {chat.chatFiles?.length > 0 && ` • ${chat.chatFiles.length} files`}
                    </p>
                  </div>
                </div>
                {chats.length > 1 && (
                  <button onClick={(e) => deleteChat(chat.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity">
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-1.5 hover:bg-gray-200 rounded transition-colors">
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-semibold">{currentChat?.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <select value={selectedProvider} onChange={(e) => changeProvider(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500">
              {Object.entries(PROVIDERS).map(([key, p]) => (
                <option key={key} value={key}>{p.icon} {p.name}</option>
              ))}
            </select>

            {availableModels.length > 0 && (
              <select value={selectedModel} onChange={(e) => changeModel(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 max-w-[120px] hidden sm:block">
                {availableModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}

            <button onClick={toggleKey} disabled={!userApiKey} className={`p-1.5 border rounded-lg ${useOwnKey ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-100'}`} title={useOwnKey ? 'Your API' : 'System API'}>
              <Key className="w-3.5 h-3.5" />
            </button>

            {/* Files Dropdown Button */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowFilesDropdown(!showFilesDropdown)} 
                className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 relative flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
                {totalFiles > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {totalActiveFiles}/{totalFiles}
                  </span>
                )}
              </button>

              {/* Files Dropdown Menu with Toggles */}
              {showFilesDropdown && (
                <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-[600px] overflow-hidden flex flex-col">
                  
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-sm">File Manager</h3>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium text-green-600">{totalActiveFiles}</span>
                        <span className="text-gray-400"> / {totalFiles} active</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Upload and manage your files</p>
                  </div>

                  {/* Upload Options */}
                  <div className="p-3 border-b border-gray-200 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          fileInputRef.current?.click()
                          fileInputRef.current?.setAttribute('data-scope', 'chat')
                        }}
                        className="flex flex-col items-center gap-1 p-3 border-2 border-purple-300 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <MessageCircle className="w-5 h-5 text-purple-600" />
                        <span className="text-xs font-medium text-purple-700">Chat Only</span>
                        <span className="text-[10px] text-purple-600">Temporary</span>
                      </button>

                      <button
                        onClick={() => {
                          fileInputRef.current?.click()
                          fileInputRef.current?.setAttribute('data-scope', 'user')
                        }}
                        className="flex flex-col items-center gap-1 p-3 border-2 border-blue-300 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Database className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700">My Database</span>
                        <span className="text-[10px] text-blue-600">Saved</span>
                      </button>

                      <button
                        onClick={() => {
                          fileInputRef.current?.click()
                          fileInputRef.current?.setAttribute('data-scope', 'global')
                        }}
                        className="flex flex-col items-center gap-1 p-3 border-2 border-green-300 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <Globe className="w-5 h-5 text-green-600" />
                        <span className="text-xs font-medium text-green-700">Global</span>
                        <span className="text-[10px] text-green-600">Shared</span>
                      </button>
                    </div>
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      multiple 
                      onChange={(e) => {
                        const scope = e.target.getAttribute('data-scope') || 'user'
                        uploadFiles(e.target.files, scope)
                        e.target.value = ''
                      }} 
                      className="hidden" 
                    />
                  </div>

                  {/* Files List with Toggles - Scrollable */}
                  <div className="flex-1 overflow-y-auto custom-scroll">
                    
                    {/* Chat Files Section */}
                    {chatFiles.length > 0 && (
                      <div className="border-b border-gray-200">
                        {/* Section Header - Collapsible */}
                        <button
                          onClick={() => toggleSection('chat')}
                          className="w-full p-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                        >
                          {sectionCollapsed.chat ? (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                          <MessageCircle className="w-4 h-4 text-purple-600" />
                          <h4 className="text-xs font-semibold text-purple-700 flex-1">
                            Chat Only ({chatFiles.filter(f => fileEnabled[f.id] !== false).length}/{chatFiles.length})
                          </h4>
                          <span className="text-[10px] text-purple-500">Temporary</span>
                        </button>

                        {/* Files List */}
                        {!sectionCollapsed.chat && (
                          <div className="px-3 pb-3 space-y-1">
                            {chatFiles.map(f => {
                              const isEnabled = fileEnabled[f.id] !== false
                              return (
                                <div 
                                  key={f.id} 
                                  className={`flex items-center gap-2 p-2 rounded-lg text-xs group transition-all ${
                                    isEnabled 
                                      ? 'bg-purple-50 border border-purple-200' 
                                      : 'bg-gray-50 border border-gray-200 opacity-50'
                                  }`}
                                >
                                  {/* Toggle Button */}
                                  <button
                                    onClick={() => toggleFileEnabled(f.id)}
                                    className="flex-shrink-0 p-1 hover:bg-purple-100 rounded transition-colors"
                                    title={isEnabled ? 'Disable file' : 'Enable file'}
                                  >
                                    {isEnabled ? (
                                      <Eye className="w-3.5 h-3.5 text-purple-600" />
                                    ) : (
                                      <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                                    )}
                                  </button>

                                  <FileText className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                                  
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${isEnabled ? 'text-purple-900' : 'text-gray-500'}`}>
                                      {f.name}
                                    </p>
                                    <p className={isEnabled ? 'text-purple-600' : 'text-gray-400'}>
                                      {f.size}
                                    </p>
                                  </div>
                                  
                                  <button 
                                    onClick={() => downloadFile(f)} 
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-purple-200 rounded transition-opacity"
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5 text-purple-700" />
                                  </button>
                                  
                                  <button 
                                    onClick={() => deleteFile(f)} 
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                                    title="Remove"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* User Files Section */}
                    {userFiles.length > 0 && (
                      <div className="border-b border-gray-200">
                        <button
                          onClick={() => toggleSection('user')}
                          className="w-full p-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                        >
                          {sectionCollapsed.user ? (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                          <Database className="w-4 h-4 text-blue-600" />
                          <h4 className="text-xs font-semibold text-blue-700 flex-1">
                            My Database ({userFiles.filter(f => fileEnabled[f.id] !== false).length}/{userFiles.length})
                          </h4>
                          <span className="text-[10px] text-blue-500">Persistent</span>
                        </button>

                        {!sectionCollapsed.user && (
                          <div className="px-3 pb-3 space-y-1">
                            {userFiles.map(f => {
                              const isEnabled = fileEnabled[f.id] !== false
                              return (
                                <div 
                                  key={f.id} 
                                  className={`flex items-center gap-2 p-2 rounded-lg text-xs group transition-all ${
                                    isEnabled 
                                      ? 'bg-blue-50 border border-blue-200' 
                                      : 'bg-gray-50 border border-gray-200 opacity-50'
                                  }`}
                                >
                                  <button
                                    onClick={() => toggleFileEnabled(f.id)}
                                    className="flex-shrink-0 p-1 hover:bg-blue-100 rounded transition-colors"
                                    title={isEnabled ? 'Disable file' : 'Enable file'}
                                  >
                                    {isEnabled ? (
                                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                                    ) : (
                                      <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                                    )}
                                  </button>

                                  <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                  
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${isEnabled ? 'text-blue-900' : 'text-gray-500'}`}>
                                      {f.name}
                                    </p>
                                    <p className={isEnabled ? 'text-blue-600' : 'text-gray-400'}>
                                      {f.size}
                                    </p>
                                  </div>
                                  
                                  <button 
                                    onClick={() => downloadFile(f)} 
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-200 rounded transition-opacity"
                                  >
                                    <Download className="w-3.5 h-3.5 text-blue-700" />
                                  </button>
                                  
                                  <button 
                                    onClick={() => deleteFile(f)} 
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Global Files Section */}
                    {globalFiles.length > 0 && (
                      <div className="border-b border-gray-200">
                        <button
                          onClick={() => toggleSection('global')}
                          className="w-full p-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                        >
                          {sectionCollapsed.global ? (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                          <Globe className="w-4 h-4 text-green-600" />
                          <h4 className="text-xs font-semibold text-green-700 flex-1">
                            Global Database ({globalFiles.filter(f => fileEnabled[f.id] !== false).length}/{globalFiles.length})
                          </h4>
                          <span className="text-[10px] text-green-500">Shared</span>
                        </button>

                        {!sectionCollapsed.global && (
                          <div className="px-3 pb-3 space-y-1">
                            {globalFiles.map(f => {
                              const isEnabled = fileEnabled[f.id] !== false
                              return (
                                <div 
                                  key={f.id} 
                                  className={`flex items-center gap-2 p-2 rounded-lg text-xs group transition-all ${
                                    isEnabled 
                                      ? 'bg-green-50 border border-green-200' 
                                      : 'bg-gray-50 border border-gray-200 opacity-50'
                                  }`}
                                >
                                  <button
                                    onClick={() => toggleFileEnabled(f.id)}
                                    className="flex-shrink-0 p-1 hover:bg-green-100 rounded transition-colors"
                                    title={isEnabled ? 'Disable file' : 'Enable file'}
                                  >
                                    {isEnabled ? (
                                      <Eye className="w-3.5 h-3.5 text-green-600" />
                                    ) : (
                                      <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                                    )}
                                  </button>

                                  <FileText className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                  
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${isEnabled ? 'text-green-900' : 'text-gray-500'}`}>
                                      {f.name}
                                    </p>
                                    <p className={isEnabled ? 'text-green-600' : 'text-gray-400'}>
                                      {f.size}
                                    </p>
                                  </div>
                                  
                                  <button 
                                    onClick={() => downloadFile(f)} 
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-green-200 rounded transition-opacity"
                                  >
                                    <Download className="w-3.5 h-3.5 text-green-700" />
                                  </button>
                                  
                                  {f.uploadedBy === user.id && (
                                    <button 
                                      onClick={() => deleteFile(f)} 
                                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Empty State */}
                    {totalFiles === 0 && (
                      <div className="p-8 text-center text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No files uploaded</p>
                        <p className="text-xs mt-1">Choose a scope above to upload</p>
                      </div>
                    )}
                  </div>

                  {/* Footer Info */}
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      👁️ Click eye icon to enable/disable files<br/>
                      🟣 <strong>Chat:</strong> Temporary • 🔵 <strong>Database:</strong> Persistent • 🟢 <strong>Global:</strong> Shared
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setShowDrive(true)} className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-100">
              <Cloud className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 custom-scroll">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {!currentChat?.messages || currentChat.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
                <p className="text-gray-500 text-sm">Upload files or type a message</p>
                {totalActiveFiles > 0 && (
                  <div className="mt-4 text-xs text-blue-600">
                    📎 {totalActiveFiles} file{totalActiveFiles > 1 ? 's' : ''} active
                  </div>
                )}
              </div>
            ) : (
              currentChat.messages.map((msg, idx) => (
                <div key={idx} className={`mb-6 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-[85%] ${
                    msg.role === 'user' 
                      ? 'bg-black text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  } rounded-2xl px-5 py-3 shadow-sm`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="mb-6">
                <div className="inline-block bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Message..."
                disabled={loading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    sendMessage(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-500 transition-colors"
              />
              <button
                onClick={(e) => {
                  const input = e.target.closest('div').querySelector('input')
                  if (input.value.trim()) {
                    sendMessage(input.value)
                    input.value = ''
                  }
                }}
                disabled={loading}
                className="px-5 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals remain the same - keeping original Drive and Settings modals */}
    </div>
  )
}
