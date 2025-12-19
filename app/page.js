'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Upload, Send, FileText, Loader2, Trash2, LogOut, X, Power, Cloud, Settings } from 'lucide-react'

const PROVIDERS = {
  perplexity: { name: 'Perplexity', icon: '🔮' },
  openai: { name: 'OpenAI', icon: '🤖' },
  gemini: { name: 'Gemini', icon: '✨' },
  huggingface: { name: 'HF', icon: '🤗' },
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

  const [notification, setNotification] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const [showDrive, setShowDrive] = useState(false)

  const [availableModels, setAvailableModels] = useState([])
  const [userApiKey, setUserApiKey] = useState('')
  const [useOwnKey, setUseOwnKey] = useState(false)
  const [apiKeyTemp, setApiKeyTemp] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('perplexity')
  const [selectedModel, setSelectedModel] = useState('sonar-reasoning')

  const [driveConnected, setDriveConnected] = useState(false)
  const [driveFiles, setDriveFiles] = useState([])
  const [selectedDriveFiles, setSelectedDriveFiles] = useState([])
  const [loadingDrive, setLoadingDrive] = useState(false)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const notify = (msg, type = 'info') => {
    setNotification({ message: msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (user) {
      const savedKey = localStorage.getItem('key_' + user.id)
      const savedProvider = localStorage.getItem('provider_' + user.id)
      const savedModel = localStorage.getItem('model_' + user.id)
      const savedPref = localStorage.getItem('own_' + user.id)
      const driveToken = localStorage.getItem('drive_' + user.id)
      const savedDrive = localStorage.getItem('dfiles_' + user.id)

      if (savedKey) setUserApiKey(savedKey)
      if (savedProvider) setSelectedProvider(savedProvider)
      if (savedModel) setSelectedModel(savedModel)
      if (savedPref === 'true') setUseOwnKey(true)
      if (driveToken) setDriveConnected(true)
      if (savedDrive) setSelectedDriveFiles(JSON.parse(savedDrive))

      loadUserFiles()
      fetchModels(savedProvider || 'perplexity')
    }
  }, [user])

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

  const saveKey = () => {
    if (!apiKeyTemp.trim() || apiKeyTemp.length < 20) {
      notify('Invalid API Key', 'error')
      return
    }
    localStorage.setItem('key_' + user.id, apiKeyTemp.trim())
    setUserApiKey(apiKeyTemp.trim())
    setShowSettings(false)
    notify('✓ Saved', 'success')
  }

  const clearKey = () => {
    localStorage.removeItem('key_' + user.id)
    localStorage.removeItem('own_' + user.id)
    setUserApiKey('')
    setApiKeyTemp('')
    setUseOwnKey(false)
    notify('Cleared', 'info')
  }

  const toggleKey = () => {
    if (!userApiKey) {
      notify('Set API Key first', 'error')
      setShowSettings(true)
      return
    }
    const v = !useOwnKey
    setUseOwnKey(v)
    localStorage.setItem('own_' + user.id, v.toString())
    notify(v ? '✓ Your API' : '✓ System API', 'success')
  }

  const connectDrive = () => {
    setLoadingDrive(true)
    window.location.href = '/api/auth/google/drive'
  }

  const loadDrive = async () => {
    setLoadingDrive(true)
    try {
      const res = await fetch('/api/gdrive/files')
      if (!res.ok) {
        if (res.status === 401) {
          setDriveConnected(false)
          localStorage.removeItem('drive_' + user.id)
          notify('Reconnect Drive', 'error')
          return
        }
        throw new Error('Failed')
      }
      const data = await res.json()
      setDriveFiles(data.files || [])
      setDriveConnected(true)
      localStorage.setItem('drive_' + user.id, 'connected')
    } catch (error) {
      notify('Failed to load', 'error')
    } finally {
      setLoadingDrive(false)
    }
  }

  const toggleDrive = (fileId, fileName) => {
    setSelectedDriveFiles(prev => {
      const exists = prev.find(f => f.id === fileId)
      let newSel
      if (exists) {
        newSel = prev.filter(f => f.id !== fileId)
      } else {
        newSel = [...prev, { id: fileId, name: fileName }]
      }
      localStorage.setItem('dfiles_' + user.id, JSON.stringify(newSel))
      return newSel
    })
  }

  const disconnectDrive = () => {
    localStorage.removeItem('drive_' + user.id)
    localStorage.removeItem('dfiles_' + user.id)
    setDriveConnected(false)
    setSelectedDriveFiles([])
    notify('Disconnected', 'info')
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
      setUploadedFiles(data.map(f => ({
        id: f.id,
        name: f.name,
        size: (f.file_size / 1024).toFixed(1) + 'K',
        file_path: f.file_path,
        content: f.content
      })))
    } catch (error) {
      console.error('Load:', error)
    }
  }

  const uploadFiles = async (files) => {
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
        await loadUserFiles()
        notify('✓ ' + count + ' uploaded', 'success')
      }
    } catch (error) {
      notify('Upload failed', 'error')
    } finally {
      setLoading(false)
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
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files)
  }

  const deleteFile = async (file) => {
    if (!confirm('Delete ' + file.name + '?')) return
    try {
      setLoading(true)
      await supabase.storage.from('documents').remove([file.file_path])
      await supabase.from('files').delete().eq('id', file.id).eq('user_id', user.id)
      await loadUserFiles()
      notify('✓ Deleted', 'success')
    } catch (error) {
      notify('Failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fileContents = uploadedFiles.map(f => ({ name: f.name, content: f.content }))

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token
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
          message: msg,
          fileContents,
          driveFileIds: selectedDriveFiles.map(f => f.id),
          useOwnKey: useOwnKey && !!userApiKey,
          provider: selectedProvider,
          model: selectedModel
        })
      })

      if (!res.ok) throw new Error('Failed')

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error' }])
      notify('Failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin neon-glow" />
      </div>
    )
  }

  const totalFiles = uploadedFiles.length + selectedDriveFiles.length

  return (
    <div 
      className="flex flex-col h-screen bg-black text-white"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={"neon-border rounded-xl px-4 py-2 backdrop-blur-xl " + (
            notification.type === 'success' ? 'border-green-400' :
            notification.type === 'error' ? 'border-red-400' :
            'border-cyan-400'
          )}>
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {isDragging && (
        <div className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center">
          <div className="neon-box p-8 rounded-2xl">
            <Upload className="w-16 h-16 mx-auto mb-3 text-cyan-400 neon-glow" />
            <p className="text-xl font-bold neon-text">Drop Files</p>
          </div>
        </div>
      )}

      <div className="border-b border-gray-900 p-3 backdrop-blur-xl bg-black/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg neon-text">AI CHAT</h1>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={selectedProvider}
              onChange={(e) => changeProvider(e.target.value)}
              className="neon-select text-xs px-2 py-1.5 rounded-lg"
            >
              {Object.entries(PROVIDERS).map(([key, p]) => (
                <option key={key} value={key}>{p.icon} {p.name}</option>
              ))}
            </select>

            {availableModels.length > 0 && (
              <select
                value={selectedModel}
                onChange={(e) => changeModel(e.target.value)}
                className="neon-select text-xs px-2 py-1.5 rounded-lg max-w-[100px] hidden sm:block"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={toggleKey}
              disabled={!userApiKey}
              className={"neon-btn p-1.5 rounded-lg " + (useOwnKey ? 'active' : '')}
              title={useOwnKey ? 'Your API' : 'System'}
            >
              <Power className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowFiles(true)}
              className="neon-btn p-1.5 rounded-lg relative"
            >
              <FileText className="w-4 h-4" />
              {totalFiles > 0 && (
                <span className="absolute -top-1 -right-1 bg-cyan-400 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center neon-glow">
                  {totalFiles}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowDrive(true)}
              className={"neon-btn p-1.5 rounded-lg " + (driveConnected ? 'active' : '')}
            >
              <Cloud className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="neon-btn p-1.5 rounded-lg"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={signOut}
              className="neon-btn p-1.5 rounded-lg hover:border-red-400"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scroll">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 neon-circle mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-12 h-12 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 neon-text">Start Chatting</h3>
              <p className="text-sm text-gray-600 mb-3">Upload files or connect Drive</p>
              <div className="flex gap-3 justify-center text-xs text-gray-700">
                <span>📁 {uploadedFiles.length}</span>
                <span>•</span>
                <span>☁️ {selectedDriveFiles.length}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={"flex mb-4 " + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={"max-w-[85%] rounded-2xl px-4 py-3 text-sm " + (
                  msg.role === 'user' 
                    ? 'bg-white text-black font-medium' 
                    : 'neon-box bg-black/50 backdrop-blur-xl'
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-3 border-t border-gray-900 backdrop-blur-xl bg-black/50">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            disabled={loading}
            className="flex-1 neon-input px-4 py-3 rounded-xl text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="neon-btn-primary px-6 py-3 rounded-xl font-bold disabled:opacity-30"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>

      {showFiles && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in">
          <div className="neon-panel w-full max-w-md max-h-[85vh] overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-900">
              <h2 className="font-bold flex items-center gap-2 neon-text">
                <FileText className="w-5 h-5" />
                FILES
              </h2>
              <button onClick={() => setShowFiles(false)} className="neon-btn p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full neon-btn-primary py-3 rounded-xl font-bold text-sm"
              >
                <Upload className="w-4 h-4 inline mr-2" />
                UPLOAD
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => uploadFiles(e.target.files)}
                className="hidden"
              />
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-4 pb-4 custom-scroll">
              {uploadedFiles.length === 0 ? (
                <p className="text-center py-8 text-gray-700 text-sm">No files</p>
              ) : (
                <div className="space-y-2">
                  {uploadedFiles.map((f) => (
                    <div key={f.id} className="group neon-box p-3 rounded-xl flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        <p className="text-xs text-gray-600">{f.size}</p>
                      </div>
                      <button
                        onClick={() => deleteFile(f)}
                        className="opacity-0 group-hover:opacity-100 neon-btn p-1.5 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDrive && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in">
          <div className="neon-panel w-full max-w-md max-h-[85vh] overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-900">
              <h2 className="font-bold flex items-center gap-2 neon-text">
                <Cloud className="w-5 h-5" />
                DRIVE
              </h2>
              <button onClick={() => setShowDrive(false)} className="neon-btn p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {!driveConnected ? (
                <button
                  onClick={connectDrive}
                  disabled={loadingDrive}
                  className="w-full neon-btn-primary py-3 rounded-xl font-bold text-sm"
                >
                  {loadingDrive ? <Loader2 className="w-4 h-4 inline animate-spin" /> : <Cloud className="w-4 h-4 inline mr-2" />}
                  CONNECT
                </button>
              ) : (
                <>
                  <button
                    onClick={loadDrive}
                    disabled={loadingDrive}
                    className="w-full neon-btn-primary py-3 rounded-xl font-bold text-sm"
                  >
                    {loadingDrive ? <Loader2 className="w-4 h-4 inline animate-spin" /> : 'LOAD FILES'}
                  </button>
                  <button
                    onClick={disconnectDrive}
                    className="w-full neon-btn py-2 rounded-xl text-xs"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>

            {driveConnected && selectedDriveFiles.length > 0 && (
              <div className="px-4 pb-2">
                <div className="neon-box px-3 py-2 rounded-lg text-xs font-medium">
                  ✓ {selectedDriveFiles.length} selected
                </div>
              </div>
            )}

            {driveConnected && (
              <div className="max-h-[50vh] overflow-y-auto px-4 pb-4 custom-scroll">
                {driveFiles.length === 0 ? (
                  <p className="text-center py-8 text-gray-700 text-sm">Click LOAD FILES</p>
                ) : (
                  <div className="space-y-2">
                    {driveFiles.map((f) => {
                      const selected = selectedDriveFiles.find(s => s.id === f.id)
                      return (
                        <button
                          key={f.id}
                          onClick={() => toggleDrive(f.id, f.name)}
                          className={"w-full text-left neon-box p-3 rounded-xl flex items-center gap-3 " + (
                            selected ? 'active' : ''
                          )}
                        >
                          <div className={"w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 " + (
                            selected ? 'border-cyan-400 bg-cyan-400/20' : 'border-gray-700'
                          )}>
                            {selected && <span className="text-xs">✓</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{f.name}</p>
                            <p className="text-xs text-gray-600">
                              {f.size ? ((f.size / 1024).toFixed(1) + 'K') : 'Doc'}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in">
          <div className="neon-panel w-full max-w-md rounded-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-900">
              <h2 className="font-bold neon-text">API KEY</h2>
              <button onClick={() => setShowSettings(false)} className="neon-btn p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm mb-2 text-gray-500 font-medium">Your API Key</label>
                <input
                  type="password"
                  value={apiKeyTemp}
                  onChange={(e) => setApiKeyTemp(e.target.value)}
                  placeholder="sk-..."
                  className="w-full neon-input px-4 py-3 rounded-xl text-sm"
                />
                <p className="text-xs text-gray-700 mt-2">🔒 Stored locally only</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveKey}
                  className="flex-1 neon-btn-primary py-3 rounded-xl font-bold text-sm"
                >
                  SAVE
                </button>
                {userApiKey && (
                  <button
                    onClick={clearKey}
                    className="px-4 py-3 neon-btn rounded-xl text-sm border-red-400 hover:border-red-400"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
