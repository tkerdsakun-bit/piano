'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

export default function ChatInput({ onSend, loading, disabled }) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim() || loading || disabled) return
    onSend(input.trim())
    setInput('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Message..."
            disabled={loading || disabled}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={loading || disabled || !input.trim()}
            className="px-5 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}