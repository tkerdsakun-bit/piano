console.log('Multi-Provider AI Handler loaded')

// Main entry point - routes to correct provider
export async function chatWithAI(
  message,
  fileContents = [],
  userApiKey = null,
  provider = 'huggingface'
) {
  try {
    console.log('Using provider: ' + provider)
    console.log('Using ' + (userApiKey ? 'user' : 'system') + ' API key')

    // Prepare context from uploaded files
    let context = ''
    if (fileContents.length > 0) {
      context = 'ข้อมูลจากไฟล์ที่อัปโหลด:\n\n'
      fileContents.forEach((file, index) => {
        const shortContent = (file.content || '').substring(0, 10000)
        const isTruncated = (file.content || '').length > 10000
        context +=
          'ไฟล์ที่ ' +
          (index + 1) +
          ': ' +
          file.name +
          '\n' +
          shortContent
        if (isTruncated) {
          context += '\n...(มีเนื้อหาต่ออีก)'
        }
        context += '\n\n'
      })
    }

    const prompt = context
      ? context +
        '\n\nคำถามของผู้ใช้: ' +
        message +
        '\n\nกรุณาตอบเป็นภาษาไทยโดยอิงจากเนื้อหาในไฟล์ด้านบน'
      : 'กรุณาตอบคำถามนี้เป็นภาษาไทย: ' + message

    // Route to correct AI provider
    switch ((provider || 'huggingface').toLowerCase()) {
      case 'openai':
        return await callOpenAI(prompt, userApiKey)
      case 'gemini':
        return await callGemini(prompt, userApiKey)
      case 'huggingface':
      default:
        return await callHuggingFace(prompt, userApiKey)
    }
  } catch (error) {
    console.error('AI Handler error:', error)
    throw error
  }
}

// OpenAI GPT-3.5 Handler
async function callOpenAI(prompt, userApiKey) {
  const apiKey = userApiKey || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('Missing OpenAI API key')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'คุณเป็นผู้ช่วยที่ตอบคำถามเป็นภาษาไทยอย่างชัดเจน',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('OpenAI API error:', text)
    if (res.status === 401) throw new Error('Invalid OpenAI API Key')
    throw new Error('OpenAI API error (' + res.status + '): ' + text)
  }

  const json = await res.json()
  const content =
    json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
  return content
}

// Google Gemini Handler
async function callGemini(prompt, userApiKey) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing Gemini API key')
  }

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' +
      apiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('Gemini API error:', text)
    if (res.status === 401 || res.status === 403)
      throw new Error('Invalid Gemini API Key')
    throw new Error('Gemini API error (' + res.status + '): ' + text)
  }

  const json = await res.json()
  const content =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ||
    'ไม่สามารถสร้างคำตอบได้'
  return content
}

// HuggingFace Handler
async function callHuggingFace(prompt, userApiKey) {
  const apiKey = userApiKey || process.env.HUGGINGFACE_API_KEY
  if (!apiKey) {
    throw new Error('Missing Hugging Face API key')
  }

  const res = await fetch(
    'https://router.huggingface.co/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [
          {
            role: 'system',
            content: 'คุณเป็นผู้ช่วยที่ตอบคำถามเป็นภาษาไทยอย่างชัดเจน',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('Hugging Face API error:', text)
    if (res.status === 401)
      throw new Error('Invalid Hugging Face API Key')
    throw new Error('Hugging Face API error (' + res.status + '): ' + text)
  }

  const json = await res.json()
  const content =
    json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
  return content
}
