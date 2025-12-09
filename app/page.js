'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import React, { useState } from 'react';
import { Upload, Send, FileText, Loader2, Trash2, Sparkles, Database, LogOut } from 'lucide-react';

export default function AIChatbot() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    setLoading(true);

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        
        if (result.success) {
          setUploadedFiles(prev => [...prev, result.file]);
          setMessages(prev => [...prev, {
            role: 'system',
            content: `✓ Successfully uploaded: ${file.name}`
          }]);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Upload error:', error);
        setMessages(prev => [...prev, {
          role: 'system',
          content: `❌ Failed to upload: ${file.name}`
        }]);
      }
    }

    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.response
        }]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    }

    setLoading(false);
  };

  const handleDeleteFile = async (fileId) => {
    setUploadedFiles(uploadedFiles.filter(f => f.id !== fileId));
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-white/10 backdrop-blur-xl border-r border-white/20 flex flex-col relative z-10">
        <div className="p-6 border-b border-white/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Knowledge Base</h2>
              <p className="text-sm text-purple-200">
                {uploadedFiles.length} files stored
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {uploadedFiles.length === 0 ? (
            <div className="text-center text-white/60 mt-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                <FileText className="w-10 h-10 opacity-50" />
              </div>
              <p className="text-sm font-medium">No files yet</p>
              <p className="text-xs mt-1 text-white/40">Upload to get started</p>
            </div>
          ) : (
            uploadedFiles.map(file => (
              <div key={file.id} className="group bg-white/5 backdrop-blur-sm rounded-xl p-4 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-white/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-semibold text-white truncate">
                        {file.name}
                      </p>
                    </div>
                    <p className="text-xs text-purple-200 ml-10">{file.size}</p>
                    <p className="text-xs text-white/40 ml-10 mt-1">{file.uploadedAt}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/60 hover:text-red-400 transition-all ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-white/20">
          <label className="group flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 cursor-pointer font-semibold">
            <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Upload Files</span>
            <input
              type="file"
              multiple
              accept=".xlsx,.xls,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <p className="text-xs text-white/50 text-center mt-3">
            Supports Excel, PDF, Word
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI Document Assistant</h1>
                <p className="text-sm text-purple-200">Ask me anything about your uploaded files</p>
              </div>
            </div>
            
            {/* Logout Button */}
            <button
              onClick={signOut}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center gap-2 border border-white/20"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <Sparkles className="w-12 h-12 text-purple-300" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Welcome to your AI Assistant</h2>
                <p className="text-purple-200 mb-6">Upload documents and start asking questions. I'll help you find insights and information instantly.</p>
                <div className="grid grid-cols-1 gap-3 text-left">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <p className="text-sm text-white font-medium">💡 Upload Excel files to analyze data</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <p className="text-sm text-white font-medium">📄 Upload PDFs to extract information</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <p className="text-sm text-white font-medium">📝 Upload Word docs to summarize content</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'system' ? (
                  <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 text-green-200 px-6 py-3 rounded-2xl max-w-2xl">
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ) : (
                  <div className={`max-w-2xl ${msg.role === 'user' ? 'bg-gradient-to-br from-purple-500 to-blue-500' : 'bg-white/10 backdrop-blur-sm border border-white/20'} px-6 py-4 rounded-2xl`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-300" />
                        <span className="text-xs font-semibold text-purple-300">AI Assistant</span>
                      </div>
                    )}
                    <p className="text-white leading-relaxed">{msg.content}</p>
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-purple-300 animate-spin" />
                  <span className="text-white">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white/10 backdrop-blur-xl border-t border-white/20 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask anything about your files..."
                className="flex-1 px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold flex items-center gap-2 group"
              >
                <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}