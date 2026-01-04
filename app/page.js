'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Menu, FileText, Loader2, Upload, Trash2, X, Settings, Plus, MessageSquare, LogOut, User, Key, Cloud, Download, ChevronDown, ChevronRight, Database, Globe, Eye, EyeOff, Edit2, Save } from 'lucide-react'

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

  // ✅ NEW: Rename chat state
  const [renamingChatId, setRenamingChatId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  const [sectionCollapsed, setSectionCollapsed] = useState({
    user: false,
    global: false
  })

  const [userFiles, setUserFiles] = useState([])
  const [globalFiles, setGlobalFiles] = useState([])
  const [fileEnabled, setFileEnabled] = useState({})

  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const dropdownRef = useRef(null)

  const [selectedProvider, setSelectedProvider] = useState('perplexity')
  const [selectedModel, setSelectedModel] = useState('sonar-reasoning-pro')
  const [availableModels, setAvailableModels] = useState([])
  const [useOwnKey, setUseOwnKey] = useState(false)
  const [userApiKey, setUserApiKey] = useState('')

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

      const savedFileEnabled = localStorage.getItem('fileEnabled_' + user.id)
      if (savedFileEnabled) {
        setFileEnabled(JSON.parse(savedFileEnabled))
      }

      const savedCollapsed = localStorage.getItem('sectionCollapsed_' + user.id)
      if (savedCollapsed) {
        setSectionCollapsed(JSON.parse(savedCollapsed))
      }

      if (savedKey) setUserApiKey(savedKey)
      if (savedProvider) setSelectedProvider(savedProvider)

      if (savedModel) {
        if (savedModel === 'sonar-reasoning') {
          const newModel = 'sonar-reasoning-pro'
          setSelectedModel(newModel)
          localStorage.setItem('model_' + user.id, newModel)
          notify('⚠️ Model updated to sonar-reasoning-pro', 'info')
        } else {
          setSelectedModel(savedModel)
        }
      }

      if (savedPref === 'true') setUseOwnKey(true)

      loadUserFiles()
      loadGlobalFiles()
      loadChatsFromDatabase() // ✅ CHANGED: Load from database
      fetchModels(savedProvider || 'perplexity')
    }
  }, [user])

  useEffect(() => {
    if (user) {
      localStorage.setItem('fileEnabled_' + user.id, JSON.stringify(fileEnabled))
    }
  }, [fileEnabled, user])

  useEffect(() => {
    if (user) {
      localStorage.setItem('sectionCollapsed_' + user.id, JSON.stringify(sectionCollapsed))
    }
  }, [sectionCollapsed, user])

  useEffect(() => {
    const allFiles = [...userFiles, ...globalFiles]
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
  }, [userFiles, globalFiles])

  useEffect(() => {
    if (user && chats.length === 0) {
      createNewChat()
    }
  }, [user])

  // ✅ NEW: Auto-save chat when messages change
  useEffect(() => {
    if (user && currentChatId) {
      const currentChat = chats.find(c => c.id === currentChatId)
      if (currentChat && currentChat.messages.length > 0) {
        saveChatToDatabase(currentChat)
      }
    }
  }, [chats, currentChatId, user])

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

  const toggleFileEnabled = (fileId) => {
    setFileEnabled(prev => ({
      ...prev,
      [fileId]: !prev[fileId]
    }))
  }

  const toggleSection = (section) => {
    setSectionCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // ✅ NEW: Load chats from database
  const loadChatsFromDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        const loadedChats = data.map(chat => ({
          id: chat.id,
          title: chat.title,
          messages: chat.messages,
          createdAt: new Date(chat.created_at),
          userId: chat.user_id
        }))
        setChats(loadedChats)
        setCurrentChatId(loadedChats[0].id)
      } else {
        createNewChat()
      }
    } catch (error) {
      console.error('Failed to load chats:', error)
      createNewChat()
    }
  }

  // ✅ NEW: Save chat to database
  const saveChatToDatabase = async (chat) => {
    try {
      const { error } = await supabase
        .from('chats')
        .upsert({
          id: chat.id,
          user_id: user.id,
          title: chat.title,
          messages: chat.messages,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Failed to save chat:', error)
    }
  }

  const currentChat = chats.find(c => c.id === currentChatId)

  const createNewChat = () => {
    const newChat = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      userId: user.id
    }
    setChats(prev => [newChat, ...prev])
    setCurrentChatId(newChat.id)
  }

  // ✅ UPDATED: Delete chat with database delete
  const deleteChat = async (chatId, e) => {
    e?.stopPropagation()
    if (chats.length === 1) {
      notify('Cannot delete last chat', 'error')
      return
    }

    if (!confirm('Delete this chat?')) return

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user.id)

      if (error) throw error

      setChats(prev => prev.filter(c => c.id !== chatId))
      if (currentChatId === chatId) {
        const remaining = chats.filter(c => c.id !== chatId)
        setCurrentChatId(remaining[0]?.id)
      }

      notify('✓ Chat deleted', 'success')
    } catch (error) {
      console.error('Delete chat error:', error)
      notify('Failed to delete chat', 'error')
    }
  }

  // ✅ NEW: Start renaming chat
  const startRenaming = (chatId, currentTitle, e) => {
    e?.stopPropagation()
    setRenamingChatId(chatId)
    setRenameValue(currentTitle)
  }

  // ✅ NEW: Save renamed chat
  const saveRename = async (chatId) => {
    if (!renameValue.trim()) {
      setRenamingChatId(null)
      return
    }

    try {
      const { error } = await supabase
        .from('chats')
        .update({ title: renameValue.trim() })
        .eq('id', chatId)
        .eq('user_id', user.id)

      if (error) throw error

      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, title: renameValue.trim() }
          : chat
      ))

      setRenamingChatId(null)
      notify('✓ Chat renamed', 'success')
    } catch (error) {
      console.error('Rename error:', error)
      notify('Failed to rename', 'error')
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
        notify(`✓ ${count} uploaded to \${scope} database\`, 'success')
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

      await supabase.storage.from('documents').remove([file.file_path])
      await supabase.from('files').delete().eq('id', file.id).eq('user_id', user.id)

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
      notify(`${count} uploaded to ${scope} database`, 'success')
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

  const getAllActiveFiles = () => {
    const allFiles = [
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
        'Authorization': \`Bearer \${session.access_token}\`
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

  const totalFiles = userFiles.length + globalFiles.length + driveLinkFiles.length
  const totalActiveFiles = getAllActiveFiles().length

  return (
    <div 
      className="flex h-screen bg-white"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={\`border rounded-xl px-4 py-2 backdrop-blur-xl \${
            notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' : 
            notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' : 
            'bg-blue-50 border-blue-400 text-blue-800'
          }\`}>
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center">
          <div className="border-2 border-white p-8 rounded-2xl">
            <Upload className="w-16 h-16 mx-auto mb-3 text-white" />
            <p className="text-xl font-bold text-white">Drop Files to User Database</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={\`\${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-gray-200 flex flex-col overflow-hidden bg-gray-50\`}>
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
              className={\`w-full text-left p-3 rounded-lg mb-1 group hover:bg-gray-200 transition-colors \${
                currentChatId === chat.id ? 'bg-white border border-gray-300' : ''
              }\`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    {/* ✅ NEW: Rename input or title */}
                    {renamingChatId === chat.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => saveRename(chat.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(chat.id)
                          if (e.key === 'Escape') setRenamingChatId(null)
                        }}
                        className="text-sm font-medium w-full px-1 py-0.5 border border-gray-300 rounded"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{chat.title}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">
                      {chat.messages?.length || 0} messages
                    </p>
                  </div>
                </div>
                {/* ✅ NEW: Rename and Delete buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => startRenaming(chat.id, chat.title, e)} 
                    className="p-1 hover:bg-blue-100 rounded"
                    title="Rename"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                  {chats.length > 1 && (
                    <button 
                      onClick={(e) => deleteChat(chat.id, e)} 
                      className="p-1 hover:bg-red-100 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  )}
                </div>
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

              {/* Files Dropdown Menu */}
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
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          fileInputRef.current?.click()
                          fileInputRef.current?.setAttribute('data-scope', 'user')
                        }}
                        className="flex flex-col items-center gap-1 p-3 border-2 border-blue-300 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Database className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-medium text-blue-900">User Database</span>
                      </button>
                      <button
                        onClick={() => {
                          fileInputRef.current?.click()
                          fileInputRef.current?.setAttribute('data-scope', 'global')
                        }}
                        className="flex flex-col items-center gap-1 p-3 border-2 border-purple-300 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <Globe className="w-5 h-5 text-purple-600" />
                        <span className="text-xs font-medium text-purple-900">Global Database</span>
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowFilesDropdown(false)
                        setShowDrive(true)
                      }}
                      className="w-full flex items-center justify-center gap-2 p-2.5 border-2 border-green-300 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <Cloud className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-green-900">Google Drive Link</span>
                    </button>
                  </div>

                  {/* Files List */}
                  <div className="flex-1 overflow-y-auto custom-scroll">
                    {/* User Files Section */}
                    {userFiles.length > 0 && (
                      <div className="border-b border-gray-200">
                        <button
                          onClick={() => toggleSection('user')}
                          className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          {sectionCollapsed.user ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          <Database className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-900">User Files ({userFiles.length})</span>
                        </button>
                        {!sectionCollapsed.user && (
                          <div className="p-2 space-y-1">
                            {userFiles.map(file => (
                              <div key={file.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group">
                                <button
                                  onClick={() => toggleFileEnabled(file.id)}
                                  className="flex-shrink-0"
                                >
                                  {fileEnabled[file.id] !== false ? (
                                    <Eye className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <EyeOff className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{file.name}</p>
                                  <p className="text-[10px] text-gray-500">{file.size}</p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => downloadFile(file)}
                                    className="p-1 hover:bg-blue-100 rounded"
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5 text-blue-600" />
                                  </button>
                                  <button
                                    onClick={() => deleteFile(file)}
                                    className="p-1 hover:bg-red-100 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Global Files Section */}
                    {globalFiles.length > 0 && (
                      <div className="border-b border-gray-200">
                        <button
                          onClick={() => toggleSection('global')}
                          className="w-full flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 transition-colors"
                        >
                          {sectionCollapsed.global ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          <Globe className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-900">Global Files ({globalFiles.length})</span>
                        </button>
                        {!sectionCollapsed.global && (
                          <div className="p-2 space-y-1">
                            {globalFiles.map(file => (
                              <div key={file.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group">
                                <button
                                  onClick={() => toggleFileEnabled(file.id)}
                                  className="flex-shrink-0"
                                >
                                  {fileEnabled[file.id] !== false ? (
                                    <Eye className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <EyeOff className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                                <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{file.name}</p>
                                  <p className="text-[10px] text-gray-500">{file.size}</p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => downloadFile(file)}
                                    className="p-1 hover:bg-blue-100 rounded"
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5 text-blue-600" />
                                  </button>
                                  {file.uploadedBy === user.id && (
                                    <button
                                      onClick={() => deleteFile(file)}
                                      className="p-1 hover:bg-red-100 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Google Drive Files Section */}
                    {driveLinkFiles.length > 0 && (
                      <div className="border-b border-gray-200">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50">
                          <Cloud className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-green-900">Google Drive ({driveLinkFiles.length})</span>
                        </div>
                        <div className="p-2 space-y-1">
                          {driveLinkFiles.map(file => (
                            <div key={file.fileId} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group">
                              <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{file.name}</p>
                                <p className="text-[10px] text-gray-500">Google Drive</p>
                              </div>
                              <button
                                onClick={() => removeDriveLinkFile(file.fileId)}
                                className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove"
                              >
                                <X className="w-3.5 h-3.5 text-red-600" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {totalFiles === 0 && (
                      <div className="p-8 text-center">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 mb-1">No files yet</p>
                        <p className="text-xs text-gray-400">Upload files to get started</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const scope = e.target.getAttribute('data-scope') || 'user'
                uploadFiles(e.target.files, scope)
                e.target.value = ''
              }}
            />
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 custom-scroll">
          <div className="max-w-3xl mx-auto space-y-6">
            {currentChat?.messages?.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 text-sm font-medium">
                    AI
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-black text-white rounded-br-sm' 
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center flex-shrink-0 text-sm font-medium">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 text-sm font-medium">
                  AI
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = e.target.message
              sendMessage(input.value)
              input.value = ''
            }}
            className="max-w-3xl mx-auto flex gap-2"
          >
            <input
              name="message"
              type="text"
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-500 disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Google Drive Modal */}
      {showDrive && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Google Drive Link</h2>
                <p className="text-sm text-gray-500 mt-1">Add files from Google Drive</p>
              </div>
              <button onClick={() => setShowDrive(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="Paste Google Drive link here..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                  disabled={loadingLink}
                />
                <button
                  onClick={fetchDriveLink}
                  disabled={loadingLink || !driveLink.trim()}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add
                </button>
              </div>

              {driveLinkFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">Added Files ({driveLinkFiles.length})</h3>
                  {driveLinkFiles.map(file => (
                    <div key={file.fileId} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">Google Drive</p>
                      </div>
                      <button
                        onClick={() => removeDriveLinkFile(file.fileId)}
                        className="p-1.5 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowDrive(false)}
                className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setSettingsTab('account')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  settingsTab === 'account' ? 'border-b-2 border-black' : 'text-gray-500'
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                Account
              </button>
              <button
                onClick={() => setSettingsTab('api')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  settingsTab === 'api' ? 'border-b-2 border-black' : 'text-gray-500'
                }`}
              >
                <Key className="w-4 h-4 inline mr-2" />
                API Keys
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scroll">
              {settingsTab === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Account Information</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-sm font-medium mt-1">{user?.email}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-3">Change Password</h3>
                    <div className="space-y-3">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                      />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                      />
                      <button
                        onClick={handlePasswordChange}
                        className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => {
                        signOut()
                        router.push('/login')
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'api' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Configure your AI provider API keys</p>
                  {Object.entries(PROVIDERS).map(([key, provider]) => (
                    <div key={key} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{provider.icon}</span>
                        <h3 className="text-sm font-semibold">{provider.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={apiKeys[key]}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={`Enter ${provider.name} API key`}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                        />
                        <button
                          onClick={() => saveApiKey(key)}
                          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 text-sm"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
