'use client'

import { useState } from 'react'
import { X, User, Key, LogOut } from 'lucide-react'

const PROVIDERS = ['perplexity', 'openai', 'gemini', 'huggingface', 'deepseek']

export default function SettingsModal({ isOpen, onClose, user, onSignOut }) {
  const [tab, setTab] = useState('account')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [apiKeys, setApiKeys] = useState({})
  const [useOwnKeys, setUseOwnKeys] = useState({})

  if (!isOpen) return null

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    // TODO: Call your API to change password
    try {
      // await changePassword(currentPassword, newPassword)
      alert('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      alert('Failed to change password: ' + error.message)
    }
  }

  const saveApiKey = (provider) => {
    if (!apiKeys[provider] || apiKeys[provider].length < 20) {
      alert('Invalid API key')
      return
    }
    localStorage.setItem(`api_key_${provider}`, apiKeys[provider])
    alert(`${provider} API key saved!`)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setTab('account')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              tab === 'account' 
                ? 'border-b-2 border-black text-black bg-white' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Account
          </button>
          <button
            onClick={() => setTab('api')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              tab === 'api' 
                ? 'border-b-2 border-black text-black bg-white' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            API Keys
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <button
                    onClick={handlePasswordChange}
                    className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    Update Password
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <button 
                  onClick={onSignOut}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {tab === 'api' && (
            <div className="space-y-6">
              {PROVIDERS.map(provider => (
                <div key={provider} className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold capitalize text-lg">{provider}</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useOwnKeys[provider] || false}
                        onChange={(e) => setUseOwnKeys(prev => ({
                          ...prev,
                          [provider]: e.target.checked
                        }))}
                        className="w-4 h-4 accent-black"
                      />
                      <span className="text-sm text-gray-600">Use my key</span>
                    </label>
                  </div>
                  <input
                    type="password"
                    value={apiKeys[provider] || ''}
                    onChange={(e) => setApiKeys(prev => ({
                      ...prev,
                      [provider]: e.target.value
                    }))}
                    placeholder={`${provider} API key`}
                    className="w-full px-4 py-2.5 border border-gray-300 bg-white rounded-lg focus:outline-none focus:border-gray-500 text-sm"
                  />
                  <button
                    onClick={() => saveApiKey(provider)}
                    className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium"
                  >
                    Save Key
                  </button>
                </div>
              ))}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800">
                  🔒 API keys are stored locally in your browser.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}