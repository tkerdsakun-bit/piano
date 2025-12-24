'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Menu, FileText, Loader2 } from 'lucide-react'

import ChatSidebar from '../components/ChatSidebar'
import MessageList from '../components/MessageList'
import ChatInput from '../components/ChatInput'
import SettingsModal from '../components/SettingsModal'

export default function ChatPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentChatId, setCurrentChatId] = useState(null)
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Initialize with first chat
  useEffect(() => {
    if (user && chats.length === 0) {
      const initialChat = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        userId: user.id
      }
      setChats([initialChat])
      setCurrentChatId(initialChat.id)
      
      // Load from storage
      loadChatsFromStorage(user.id)
    }
  }, [user])

  // Save chats to storage when they change
  useEffect(() => {
    if (user && chats.length > 0) {
      saveChatsToStorage(user.id, chats)
    }
  }, [chats, user])

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
      createdAt: new Date(),
      userId: user.id
    }
    setChats(prev => [newChat, ...prev])
    setCurrentChatId(newChat.id)
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

  const sendMessage = async (content) => {
    if (!content.trim() || loading) return

    const userMessage = { role: 'user', content: content.trim() }
    
    // Add user message
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

      // Get API settings from localStorage
      const useOwnKey = localStorage.getItem(`own_${user.id}`) === 'true'
      const provider = localStorage.getItem(`provider_${user.id}`) || 'perplexity'
      const model = localStorage.getItem(`model_${user.id}`) || 'sonar-reasoning-pro'
      const userApiKey = localStorage.getItem(`api_key_${provider}`)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          ...(useOwnKey && userApiKey ? {
            'X-User-API-Key': userApiKey,
            'X-AI-Provider': provider,
            'X-AI-Model': model
          } : {})
        },
        body: JSON.stringify({
          message: content,
          fileContents: [],
          useOwnKey: useOwnKey && !!userApiKey,
          provider,
          model
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

  return (
    <div className="flex h-screen bg-white">
      <ChatSidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={setCurrentChatId}
        onNewChat={createNewChat}
        onDeleteChat={deleteChat}
        onOpenSettings={() => setShowSettings(true)}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-semibold">{currentChat?.title}</h2>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <FileText className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <MessageList 
            messages={currentChat?.messages || []} 
            loading={loading} 
          />
        </div>

        {/* Input */}
        <ChatInput 
          onSend={sendMessage} 
          loading={loading}
          disabled={!user}
        />
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        onSignOut={signOut}
      />
    </div>
  )
}
