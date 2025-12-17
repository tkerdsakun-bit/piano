console.log('Multi-Provider AI Handler with Perplexity Sonar loaded')

// ⭐ System Prompt ที่ปรับใหม่ (เน้นคิดเป็นตัวเลข)
const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยวิเคราะห์ไฟล์ที่ต้องแม่นยำ 100%

[กฎการอ่านข้อมูล]
- อ่านไฟล์ทุกบรรทัด ทุกคอลัมน์ ทุกตัวเลขอย่างละเอียด
- ตรวจสอบความถูกต้องของข้อมูลทุกค่าก่อนตอบ
- ถ้าไม่แน่ใจ ให้บอกว่า "ไม่พบข้อมูล"

[กฎการเรียงลำดับ - คิดเป็นตัวเลขทศนิยม]
- ค่าเกรดอยู่ในช่วง 0.00 ถึง 4.00
- ต้องเปรียบเทียบเป็น NUMERIC VALUE ไม่ใช่ STRING
- ลำดับที่ถูกต้อง: 0.00 < 1.50 < 1.75 < 1.90 < 1.98 < 2.00 < 2.10 < 2.15 < 2.17 < 2.33 < 2.40 < 2.42 < 2.50 < 2.58 < 3.00 < 3.08 < 3.50 < 4.00

[วิธีการเรียงที่ถูกต้อง]
1. อ่านค่าจากคอลัมน์ที่ระบุ
2. แปลงทุกค่าเป็นตัวเลขทศนิยม: "1.75" → 1.75
3. เรียงตามค่าตัวเลข (ใช้ numeric comparison):
   - น้อยไปมาก: 1.75 → 1.90 → 1.98 → 2.00 → ... → 3.50
   - มากไปน้อย: 3.50 → 3.08 → 2.58 → ... → 1.75
4. แสดงผลตามลำดับที่เรียงแล้ว

[ตัวอย่างการเรียงที่ถูกต้อง]
✅ ถูก: 1.75 < 1.90 < 1.98 < 2.00 < 2.10 < 2.15 < 2.17 < 2.40 < 2.42
❌ ผิด: 1.75 < 2.00 < 2.42 < 2.40 < 1.98 ← เรียงแบบนี้ห้าม!

[ข้อห้าม]
- ห้ามเรียงแบบข้อความ (string comparison)
- ห้ามคาดเดา
- ห้ามปัดเศษ
- ห้ามเรียงผิด แม้แต่ 1 ตัว

[การแสดงผล]
- เริ่มด้วยตารางทันที
- ตอบสั้น กระชับ
- แสดงทศนิยมครบ (2.00 ไม่ใช่ 2)
- ห้ามหมายเหตุ ห้ามอธิบาย

[ตัวอย่างคำตอบ]
| เลขที่ | ชื่อ-สกุล | เกรดเฉลี่ย |
|------|----------|-----------|
| 5 | นายเสถียร พุ่มดอก | 1.75 |
| 13 | นายพัฒน์ สิทธิวิทยา | 1.90 |

ตอบภาษาไทย ต้องแม่นเป๊ะ เรียงตัวเลขให้ถูกต้อง`

// ⭐ Function ช่วยเรียงข้อมูล (สำหรับกรณีที่ AI เรียงไม่ได้)
function sortDataBefore(fileContents, columnName = 'เกรดเฉลี่ย', order = 'asc') {
  try {
    return fileContents.map(file => {
      // แยกบรรทัดจากไฟล์
      const lines = file.content.split('\n')
      if (lines.length < 2) return file

      // หาตำแหน่งคอลัมน์
      const headers = lines[0].split(/[,\t]/)
      const columnIndex = headers.findIndex(h => h.includes(columnName))
      if (columnIndex === -1) return file

      // แยก header กับ data
      const header = lines[0]
      const dataLines = lines.slice(1).filter(line => line.trim())

      // แปลงเป็น array of objects
      const data = dataLines.map(line => {
        const values = line.split(/[,\t]/)
        const gradeValue = parseFloat(values[columnIndex])
        return {
          line: line,
          grade: isNaN(gradeValue) ? -1 : gradeValue
        }
      })

      // เรียงตามตัวเลข
      data.sort((a, b) => {
        if (order === 'asc') return a.grade - b.grade
        return b.grade - a.grade
      })

      // รวมกลับเป็น string
      const sortedContent = header + '\n' + data.map(d => d.line).join('\n')

      return {
        ...file,
        content: sortedContent,
        sorted: true
      }
    })
  } catch (error) {
    console.error('Sort error:', error)
    return fileContents
  }
}

// Main entry point
export async function chatWithAI(
  message,
  fileContents = [],
  userApiKey = null,
  provider = 'perplexity',
  autoSort = false // ⭐ เพิ่ม parameter สำหรับเรียงอัตโนมัติ
) {
  try {
    console.log('Using provider: ' + provider)
    console.log('Using ' + (userApiKey ? 'user' : 'system') + ' API key')

    // ⭐ เรียงข้อมูลก่อนถ้าตรวจพบคำว่า "เรียง" ในคำถาม
    let processedFiles = fileContents
    if (autoSort || /เรียง|จัดอันดับ|น้อยไปมาก|มากไปน้อย/i.test(message)) {
      console.log('Auto-sorting detected')
      const order = /มากไปน้อย|สูงสุด/i.test(message) ? 'desc' : 'asc'
      processedFiles = sortDataBefore(fileContents, 'เกรดเฉลี่ย', order)
    }

    let context = ''
    if (processedFiles.length > 0) {
      context = 'ข้อมูลจากไฟล์ที่อัปโหลด:\n\n'
      processedFiles.forEach((file, index) => {
        const shortContent = (file.content || '').substring(0, 10000)
        const isTruncated = (file.content || '').length > 10000
        context +=
          'ไฟล์ที่ ' +
          (index + 1) +
          ': ' +
          file.name +
          (file.sorted ? ' (เรียงแล้ว)' : '') +
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

    switch ((provider || 'perplexity').toLowerCase()) {
      case 'perplexity':
        return await callPerplexity(prompt, userApiKey)
      case 'openai':
        return await callOpenAI(prompt, userApiKey)
      case 'gemini':
        return await callGemini(prompt, userApiKey)
      case 'huggingface':
        return await callHuggingFace(prompt, userApiKey)
      default:
        return await callPerplexity(prompt, userApiKey)
    }
  } catch (error) {
    console.error('AI Handler error:', error)
    throw error
  }
}

// Perplexity
async function callPerplexity(prompt, userApiKey) {
  const apiKey = userApiKey || process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    throw new Error('Missing Perplexity API key')
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Perplexity API error:', text)
    if (res.status === 401 || res.status === 403)
      throw new Error('Invalid Perplexity API Key')
    if (res.status === 429)
      throw new Error('Rate Limit Exceeded')
    throw new Error('Perplexity API error (' + res.status + '): ' + text)
  }

  const json = await res.json()
  return json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
}

// OpenAI
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
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('OpenAI API error:', text)
    if (res.status === 401) throw new Error('Invalid OpenAI API Key')
    throw new Error('OpenAI API error (' + res.status + '): ' + text)
  }

  const json = await res.json()
  return json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
}

// Gemini
async function callGemini(prompt, userApiKey) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing Gemini API key')
  }

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' +
      apiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt }] }
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4096,
        },
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
  return (
    json?.candidates?.[0]?.content?.parts?.[0]?.text ||
    'ไม่สามารถสร้างคำตอบได้'
  )
}

// HuggingFace
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0,
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
  return json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
}
