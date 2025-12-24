'use client'

import { Plus, MessageSquare, Trash2, Settings, X } from 'lucide-react'

export default function ChatSidebar({ 
  chats, 
  currentChatId, 
  onSelectChat, 
  onNewChat, 
  onDeleteChat,
  onOpenSettings,
  user,
  isOpen,
  onClose
}) {
  return (
    <div className={`${isOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-gray-200 flex flex-col overflow-hidden bg-gray-50`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <h1 className="font-semibold text-lg">Chats</h1>
        <button 
          onClick={onClose}
          className="lg:hidden p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scroll">
        {chats.map(chat => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
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
                  </p>
                </div>
              </div>
              {chats.length > 1 && (
                <button
                  onClick={(e) => onDeleteChat(chat.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* User Menu */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
          <button
            onClick={onOpenSettings}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  )
}