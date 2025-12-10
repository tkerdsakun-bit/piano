import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  throw new Error('Missing Gemini API key')
}

const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: 'v1beta' })

export async function chatWithAI(message, fileContents = []) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })


    // Build context from files
    let context = ''
    if (fileContents.length > 0) {
      context = 'Here are the contents of the uploaded files:\n\n'
      fileContents.forEach((file, index) => {
        context += `File ${index + 1}: ${file.name}\n${file.content}\n\n`
      })
    }

    const prompt = context 
      ? `${context}\n\nUser question: ${message}\n\nPlease answer based on the file contents above.`
      : message

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return text
  } catch (error) {
    console.error('Gemini API error:', error)
    throw error
  }

}

