'use client'

import { useRef, useEffect } from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'

export default function MessageList({ messages, loading }) {
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
          <MessageSquare className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
        <p className="text-gray-500 text-sm">Type a message to begin</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {messages.map((msg, idx) => (
        <div key={idx} className={`mb-6 ${msg.role === 'user' ? 'text-right' : ''}`}>
          <div className={`inline-block max-w-[85%] ${
            msg.role === 'user' 
              ? 'bg-black text-white' 
              : 'bg-white border border-gray-200 text-gray-900'
          } rounded-2xl px-5 py-3 shadow-sm`}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>
        </div>
      ))}
      {loading && (
        <div className="mb-6">
          <div className="inline-block bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
            <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}