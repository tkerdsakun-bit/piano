import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const apiKey = request.headers.get('X-API-Key')

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider parameter required' },
        { status: 400 }
      )
    }

    let models = []

    switch (provider.toLowerCase()) {
      case 'openai':
        models = await fetchOpenAIModels(apiKey)
        break
      case 'perplexity':
        models = await fetchPerplexityModels(apiKey)
        break
      case 'gemini':
        models = await fetchGeminiModels(apiKey)
        break
      case 'huggingface':
        models = await fetchHuggingFaceModels(apiKey)
        break
      case 'deepseek':
        models = await fetchDeepSeekModels(apiKey)
        break
      default:
        return NextResponse.json(
          { error: 'Unknown provider' },
          { status: 400 }
        )
    }

    return NextResponse.json({ models })
  } catch (error) {
    console.error('Model fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

// OpenAI - Fetch live models
async function fetchOpenAIModels(userApiKey) {
  const apiKey = userApiKey || process.env.OPENAI_API_KEY
  if (!apiKey) {
    // Return fallback models if no API key
    return [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
    ]
  }

  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })

    if (!res.ok) throw new Error('Failed to fetch OpenAI models')

    const data = await res.json()

    // Filter for chat models only
    const chatModels = data.data
      .filter(m => m.id.includes('gpt') && !m.id.includes('instruct'))
      .map(m => ({
        id: m.id,
        name: m.id.toUpperCase().replace(/-/g, ' ')
      }))
      .sort((a, b) => b.id.localeCompare(a.id)) // Newest first

    return chatModels.length > 0 ? chatModels : [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }
    ]
  } catch (error) {
    console.error('OpenAI models fetch error:', error)
    return [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }
    ]
  }
}

// Perplexity - Return available models (no public API for model list)
async function fetchPerplexityModels(userApiKey) {
  return [
    { id: 'sonar-reasoning', name: 'Sonar Reasoning' },
    { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small (Online)' },
    { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large (Online)' },
    { id: 'llama-3.1-sonar-huge-128k-online', name: 'Sonar Huge (Online)' }
  ]
}

// Gemini - Return available models
async function fetchGeminiModels(userApiKey) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY

  try {
    if (apiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      )

      if (res.ok) {
        const data = await res.json()
        const geminiModels = data.models
          .filter(m => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => ({
            id: m.name.replace('models/', ''),
            name: m.displayName || m.name.replace('models/', '')
          }))

        if (geminiModels.length > 0) return geminiModels
      }
    }
  } catch (error) {
    console.error('Gemini models fetch error:', error)
  }

  // Fallback models
  return [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B' }
  ]
}

// Hugging Face - Return popular models
async function fetchHuggingFaceModels(userApiKey) {
  return [
    { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B' },
    { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen 2.5 7B' },
    { id: 'meta-llama/Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B' },
    { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B' },
    { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B' },
    { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B' }
  ]
}

// DeepSeek - Return available models
async function fetchDeepSeekModels(userApiKey) {
  return [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' }
  ]
}
