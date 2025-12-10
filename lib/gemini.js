import { GoogleGenerativeAI } from '@google/generative-ai'
import { version } from '@google/generative-ai/package.json';
const allModels = await genAI.listModels();
console.log("Available models:", allModels);
console.log('Gemini SDK version:', version);

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  throw new Error('Missing Gemini API key')
}

// Force v1beta (your key does NOT support v1)
const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: 'v1beta' })

export async function chatWithAI(message, fileContents = []) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash'
    })

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

    // ✅ FIX: use correct v1beta request format
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    })

    return result.response.text()

  } catch (error) {
    console.error('Gemini API error:', error)
    throw error
  }
}


