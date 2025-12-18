// lib/gemini.js - Multi-Provider AI Handler v3.0 with Model Selection

console.log('Multi-Provider AI Handler v3.0 - Model Selection Enabled')

// ⭐ Remove Think Tags
function removeThinkTags(text) {
  if (!text) return text
  
  // Remove all variations of think tags
  let cleaned = text
    // Standard XML-style tags
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // Alternative slash format
    .replace(/\/think[\s\S]*?\/think/gi, '')
    // Square bracket format
    .replace(/\[think\][\s\S]*?\[\/think\]/gi, '')
    // Unclosed think tags (remove everything from <think> to end)
    .replace(/<think>[\s\S]*/gi, '')
    // Remove leftover closing tags
    .replace(/<\/think>/gi, '')
    .replace(/\/think/gi, '')
    .replace(/\[\/think\]/gi, '')
    .trim()
  
  // Clean up excessive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  
  return cleaned
}


// Smart content truncation
function smartTruncate(content, maxChars = 50000) {
  if (content.length <= maxChars) return content
  
  let truncated = content.substring(0, maxChars)
  const lastParagraph = truncated.lastIndexOf('\n\n')
  if (lastParagraph > maxChars * 0.8) {
    truncated = truncated.substring(0, lastParagraph)
  } else {
    const lastPeriod = truncated.lastIndexOf('.')
    if (lastPeriod > maxChars * 0.8) {
      truncated = truncated.substring(0, lastPeriod + 1)
    }
  }
  
  return truncated + '\n\n...(เนื้อหาถูกตัดเนื่องจากไฟล์ยาวเกินไป)'
}

const SYSTEM_PROMPT = `คุณเป็น AI Assistant ที่ฉลาดและช่วยเหลือได้หลากหลาย ทั้งการวิเคราะห์ไฟล์และตอบคำถามทั่วไป

⚠️ สำคัญมาก: ตอบเป็นภาษาไทยเสมอ เว้นแต่ผู้ใช้ถามเป็นภาษาอังกฤษอย่างชัดเจน

═══════════════════════════════════════════════════════════
🎯 ความสามารถหลัก
═══════════════════════════════════════════════════════════

1. วิเคราะห์ไฟล์
   - อ่าน PDF, Word, Excel, Text ได้
   - สรุปเนื้อหา ตอบคำถามเฉพาะจากไฟล์
   - จัดการข้อมูลตาราง และข้อความทั่วไป
   
2. ประมวลผลข้อมูล
   - เรียงลำดับ กรอง จัดอันดับข้อมูลอย่างแม่นยำ
   - คำนวณและวิเคราะห์สถิติ
   - เปรียบเทียบค่าและหาแพทเทิร์น
   
3. ช่วยเหลือทั่วไป
   - ตอบคำถามทุกเรื่อง (วิทยาศาสตร์, ประวัติศาสตร์, โค้ด, ฯลฯ)
   - อธิบาย สอน แนะนำทีละขั้นตอน
   - ช่วยเขียน ระดมความคิด แก้ปัญหา

4. ภาษา
   - ตอบภาษาไทยเป็นหลัก (เว้นแต่ถามเป็นอังกฤษชัดเจน)
   - สื่อสารเป็นธรรมชาติ เข้าใจง่าย

═══════════════════════════════════════════════════════════
📊 กฎการวิเคราะห์ข้อมูล (เมื่อมีไฟล์)
═══════════════════════════════════════════════════════════

[การอ่านข้อมูล]
✓ อ่านทุกแถว ทุกคอลัมน์ ทุกค่าอย่างละเอียด
✓ ตรวจสอบความถูกต้องก่อนตอบ
✓ ถ้าไม่แน่ใจ บอกว่า "ไม่พบข้อมูล" หรือ "ข้อมูลไม่ชัดเจน"
✗ ห้ามเดาหรือแต่งข้อมูล
✗ ห้ามเปลี่ยนค่าเดิม (ห้ามปัดเศษ ยกเว้นถูกขอ)

[การเรียงลำดับข้อมูล - ทำทีละขั้น]
เมื่อได้รับคำขอให้เรียง (คำว่า: เรียง, sort, rank, จัดอันดับ):

ขั้นที่ 1: หาคอลัมน์เป้าหมาย
- ระบุคอลัมน์ที่จะเรียง (เช่น "เกรดเฉลี่ย", "คะแนน")
- ยืนยันว่ามีคอลัมน์นี้ในข้อมูล

ขั้นที่ 2: ดึงค่าทั้งหมด
- ดึงค่าตัวเลขทั้งหมดจากคอลัมน์นั้น
- ตัวอย่าง: 1.75, 1.90, 1.98, 2.00, 2.10, 2.15, 2.40, 2.50, 3.08

ขั้นที่ 3: เรียงแบบตัวเลข (ไม่ใช่ตัวอักษร)
- ใช้การเปรียบเทียบแบบตัวเลข: 1.90 < 2.00 < 2.10
- ไม่ใช่เปรียบเทียบแบบ string: "1.90" > "2.00" (ผิด!)
- สำหรับทศนิยม: 2.10 < 2.15 < 2.17 < 2.40 < 2.42 < 2.50
- น้อย→มาก (asc): ค่าต่ำสุด → ค่าสูงสุด
- มาก→น้อย (desc): ค่าสูงสุด → ค่าต่ำสุด

ขั้นที่ 4: จับคู่กลับแถวเดิม
- เอาค่าที่เรียงแล้วไปจับคู่กับแถวข้อมูลต้นฉบับ
- รวมทุกคอลัมน์ (เลขที่, ชื่อ, เกรด, ฯลฯ)

ขั้นที่ 5: แสดงผลตามลำดับใหม่
- แสดงเป็นตารางพร้อมคอลัมน์ที่เกี่ยวข้อง
- ตรวจสอบว่าลำดับตรงกับขั้นที่ 3

[กฎการเปรียบเทียบ]
✓ ค่าในช่วง 1.XX น้อยกว่า 2.XX เสมอ
✓ เปรียบเทียบทศนิยม: 1.75 < 1.90 < 1.98 < 2.00
✓ ถ้าเลขหน้าจุดเท่ากัน เปรียบเทียบทศนิยม: 2.40 < 2.42 < 2.50
✗ ห้ามมองตัวเลขเป็น string
✗ ห้ามข้ามขั้นตอนตรวจสอบ

═══════════════════════════════════════════════════════════
💬 กฎการสนทนาทั่วไป (ไม่มีไฟล์)
═══════════════════════════════════════════════════════════

เมื่อไม่มีไฟล์อัปโหลด:
✓ ช่วยเหลือด้วยความเป็นมิตร ให้ข้อมูลครบถ้วน
✓ ตอบคำถามทุกหัวข้ออย่างแม่นยำ
✓ ให้ตัวอย่างและคำอธิบายเมื่อเป็นประโยชน์
✓ ยอมรับเมื่อไม่รู้คำตอบ
✓ ถามกลับเพื่อความชัดเจนถ้าคำถามคลุมเครือ

═══════════════════════════════════════════════════════════
📋 การจัดรูปแบบ
═══════════════════════════════════════════════════════════

[สำหรับข้อมูลตาราง]
ใช้ตาราง markdown

[สำหรับรายการ]
- ใช้ bullet points สำหรับลิสต์ธรรมดา
- ใช้ตัวเลขสำหรับขั้นตอน
- จัดรูปแบบให้อ่านง่าย

[ภาษา]
- ถามภาษาไทย → ตอบภาษาไทย
- ถามภาษาอังกฤษอย่างชัดเจน → ตอบภาษาอังกฤษ
- เริ่มต้นเป็นภาษาไทยเสมอ

[น้ำเสียง]
- มืออาชีพแต่เป็นกันเอง
- กระชับแต่ครบถ้วน
- ความแม่นยำเหนือสิ่งอื่นใด

═══════════════════════════════════════════════════════════
🚫 ข้อห้าม
═══════════════════════════════════════════════════════════

ห้ามทำ:
✗ แต่งข้อมูลหรือสถิติ
✗ อ้างว่ามีความสามารถที่ไม่มี
✗ ให้คำแนะนำทางการแพทย์ กฎหมาย การเงิน
✗ สร้างเนื้อหาที่เป็นอันตราย
✗ ปัดเศษตัวเลขโดยไม่ได้รับการขอ
✗ ข้ามขั้นตอนตรวจสอบเมื่อเรียง/คำนวณ

🔥 สำคัญที่สุด: ตอบเป็นภาษาไทยเป็นหลัก!`

// Improved sorting
function sortDataBefore(fileContents, columnName = 'เกรดเฉลี่ย', order = 'asc') {
  try {
    return fileContents.map(file => {
      const lines = file.content.split('\n').filter(l => l.trim())
      if (lines.length < 2) return file

      const headers = lines[0].split(/[,\t|]/)
      const columnIndex = headers.findIndex(h => h.trim().includes(columnName))
      
      if (columnIndex === -1) {
        console.warn(`Column "${columnName}" not found in ${file.name}`)
        return file
      }

      const header = lines[0]
      const dataLines = lines.slice(1)

      const data = dataLines.map(line => {
        const values = line.split(/[,\t|]/)
        const valueStr = values[columnIndex]?.trim() || ''
        const gradeValue = parseFloat(valueStr)
        
        return {
          line: line,
          grade: isNaN(gradeValue) ? -1 : gradeValue,
          originalValue: valueStr
        }
      })

      const validData = data.filter(d => d.grade !== -1)
      validData.sort((a, b) => order === 'asc' ? a.grade - b.grade : b.grade - a.grade)

      const sortedContent = header + '\n' + validData.map(d => d.line).join('\n')

      console.log(`Sorted ${file.name}: ${validData.length} valid rows, order: ${order}`)

      return {
        ...file,
        content: sortedContent,
        sorted: true,
        sortDetails: {
          column: columnName,
          order,
          rowCount: validData.length
        }
      }
    })
  } catch (error) {
    console.error('Sort error:', error)
    return fileContents
  }
}

// ⭐ Main entry point with model selection support
export async function chatWithAI(
  message,
  fileContents = [],
  userApiKey = null,
  provider = 'perplexity',
  model = null,
  autoSort = true
) {
  try {
    console.log(`Provider: ${provider}, Model: ${model || 'default'}, API: ${userApiKey ? 'user' : 'system'}`)

    // Smart auto-sorting
    let processedFiles = fileContents
    const needsSorting = autoSort && /เรียง|จัดอันดับ|น้อยไปมาก|มากไปน้อย|ต่ำสุด|สูงสุด/i.test(message)
    
    if (needsSorting) {
      const order = /มากไปน้อย|สูงสุด|มาก.*น้อย/i.test(message) ? 'desc' : 'asc'
      console.log(`Auto-sorting: ${order}`)
      processedFiles = sortDataBefore(fileContents, 'เกรดเฉลี่ย', order)
    }

    // Build context
    let context = ''
    if (processedFiles.length > 0) {
      context = '📁 ข้อมูลจากไฟล์ที่อัปโหลด:\n\n'
      processedFiles.forEach((file, index) => {
        const truncated = smartTruncate(file.content || '', 10000)
        context += `📄 ไฟล์ที่ ${index + 1}: ${file.name}`
        if (file.sorted) {
          context += ` ✓ เรียงแล้วตาม${file.sortDetails?.column} (${file.sortDetails?.order})`
        }
        context += '\n' + truncated + '\n\n'
      })
    }

    const prompt = context
      ? context + '\n\n❓ คำถาม: ' + message + '\n\n💡 กรุณาตอบเป็นภาษาไทยโดยอิงจากเนื้อหาในไฟล์'
      : '❓ ' + message

    // Route to provider with model
    const providerLower = (provider || 'perplexity').toLowerCase()
    
    switch (providerLower) {
      case 'perplexity':
        return await callPerplexity(prompt, userApiKey, model)
      case 'openai':
        return await callOpenAI(prompt, userApiKey, model)
      case 'gemini':
        return await callGemini(prompt, userApiKey, model)
      case 'huggingface':
        return await callHuggingFace(prompt, userApiKey, model)
      case 'deepseek':
        return await callDeepSeek(prompt, userApiKey, model)
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  } catch (error) {
    console.error('AI Handler error:', error)
    
    if (error.message.includes('401') || error.message.includes('Invalid')) {
      throw new Error('🔑 API Key ไม่ถูกต้อง กรุณาตรวจสอบ API Key ของคุณ')
    }
    if (error.message.includes('429')) {
      throw new Error('⏱️ ใช้งานเกินโควต้า กรุณารอสักครู่แล้วลองใหม่')
    }
    if (error.message.includes('timeout')) {
      throw new Error('⏱️ หมดเวลาการเชื่อมต่อ กรุณาลองใหม่')
    }
    
    throw error
  }
}

// ============================================
// Perplexity API
// ============================================
async function callPerplexity(prompt, userApiKey, model) {
  const apiKey = userApiKey || process.env.PERPLEXITY_API_KEY
  if (!apiKey) throw new Error('Missing Perplexity API key')

  const selectedModel = model || 'sonar-reasoning'
  console.log(`Perplexity model: ${selectedModel}`)
  
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: selectedModel,
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
    console.error('Perplexity API error:', res.status, text)
    throw new Error(`Perplexity API error (${res.status}): ${text}`)
  }

  const json = await res.json()
  let content = json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
  content = removeThinkTags(content)
  return content
}

// ============================================
// OpenAI API
// ============================================
async function callOpenAI(prompt, userApiKey, model) {
  const apiKey = userApiKey || process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Missing OpenAI API key')

  const selectedModel = model || 'gpt-4o'
  console.log(`OpenAI model: ${selectedModel}`)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: selectedModel,
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
    console.error('OpenAI API error:', res.status, text)
    throw new Error(`OpenAI API error (${res.status}): ${text}`)
  }

  const json = await res.json()
  const content = json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
  return content
}

// ============================================
// Google Gemini API
// ============================================
async function callGemini(prompt, userApiKey, model) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Missing Gemini API key')

  const selectedModel = model || 'gemini-2.0-flash-exp'
  console.log(`Gemini model: ${selectedModel}`)

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }]
          }
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
    console.error('Gemini API error:', res.status, text)
    throw new Error(`Gemini API error (${res.status}): ${text}`)
  }

  const json = await res.json()
  const content = json?.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่สามารถสร้างคำตอบได้'
  return content
}

// ============================================
// Hugging Face API
// ============================================
async function callHuggingFace(prompt, userApiKey, model) {
  const apiKey = userApiKey || process.env.HUGGINGFACE_API_KEY
  if (!apiKey) throw new Error('Missing Hugging Face API key')

  const selectedModel = model || 'Qwen/Qwen2.5-72B-Instruct'
  console.log(`Hugging Face model: ${selectedModel}`)

  const res = await fetch(
    `https://api-inference.huggingface.co/models/${selectedModel}/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0,
        stream: false,
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('Hugging Face API error:', res.status, text)
    throw new Error(`Hugging Face API error (${res.status}): ${text}`)
  }

  const json = await res.json()
  const content = json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
  return content
}

// ============================================
// 🆕 DeepSeek API
// ============================================
async function callDeepSeek(prompt, userApiKey, model) {
  const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('Missing DeepSeek API key')

  const selectedModel = model || 'deepseek-chat'
  console.log(`DeepSeek model: ${selectedModel}`)

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: selectedModel,
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
    console.error('DeepSeek API error:', res.status, text)
    throw new Error(`DeepSeek API error (${res.status}): ${text}`)
  }

  const json = await res.json()
  let content = json?.choices?.[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้'
  
  // DeepSeek Reasoner (R1) may include reasoning tokens - clean them
  content = removeThinkTags(content)
  
  return content
}


