console.log('Multi-Provider AI Handler with Perplexity Sonar loaded')

// ⭐ System Prompt แบบคิดเป็นตัวเลข 0.00-4.00
const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยวิเคราะห์ไฟล์ที่ต้องแม่นยำ 100%

[กฎการอ่านข้อมูล]
- อ่านไฟล์ทุกบรรทัด ทุกคอลัมน์ ทุกตัวเลขอย่างละเอียด
- แปลงค่าทศนิยมเป็นตัวเลข (numeric value) ก่อนประมวลผล
- ตรวจสอบความถูกต้องของข้อมูลทุกค่าก่อนตอบ
- ถ้าไม่แน่ใจ ห้ามตอบ ให้บอกว่า "ไม่พบข้อมูล"

[กฎการเรียงลำดับ - คิดเป็นตัวเลข]
- ค่าเกรดอยู่ในช่วง 0.00 ถึง 4.00 เท่านั้น
- ต้องเปรียบเทียบเป็นตัวเลขทศนิยม ไม่ใช่เปรียบเทียบแบบข้อความ
- ตัวอย่างการเปรียบเทียบที่ถูกต้อง:
  0.00 < 0.50 < 1.00 < 1.50 < 1.75 < 1.90 < 1.98 < 2.00 < 2.10 < 2.15 < 2.17 < 2.33 < 2.40 < 2.42 < 2.50 < 2.58 < 3.00 < 3.08 < 3.33 < 3.50 < 3.75 < 4.00

[คำสั่งการเรียง]
- "น้อยไปมาก" = เริ่มจาก 0.00 → 4.00 (ต่ำสุดไปสูงสุด)
- "มากไปน้อย" = เริ่มจาก 4.00 → 0.00 (สูงสุดไปต่ำสุด)
- ห้ามเรียงผิด แม้แต่ 1 ตัว
- ตรวจสอบการเรียงซ้ำอีกครั้งก่อนแสดงผล

[วิธีการเรียงที่ถูกต้อง]
1. อ่านค่าทศนิยมจากคอลัมน์ที่ระบุ (เช่น "เกรดเฉลี่ย")
2. แปลงเป็นตัวเลข: "1.75" → 1.75, "2.00" → 2.00, "3.50" → 3.50
3. เรียงตามค่าตัวเลขจากน้อยไปมาก: 1.75 < 1.90 < 1.98 < 2.00 < ... < 3.50
4. แสดงผลเป็นตาราง

[ตัวอย่างการเรียงที่ถูกต้อง]
ถูก (น้อย→มาก): 1.75 < 1.90 < 1.98 < 2.00 < 2.10 < 2.15 < 2.17 < 2.40 < 2.42 < 2.50 < 2.58 < 3.08 < 3.50
ผิด: 1.90 < 2.00 < 1.98 ← ผิด! (1.98 ต้องมาก่อน 2.00)

[ข้อห้ามสำคัญ]
- ห้ามเรียงแบบข้อความ (text sorting) เช่น "2.00" มาก่อน "1.98" (ผิด!)
- ห้ามคาดเดาข้อมูล
- ห้ามใช้ "ประมาณ" "ราวๆ"
- ห้ามปัดเศษทศนิยม
- ห้ามเรียงผิด

[การแสดงผล]
- เริ่มต้นด้วยตารางทันที
- ตอบสั้น กระชับ
- แสดงทศนิยมครบทุกหลัก (เช่น 2.00 ไม่ใช่ 2)
- ห้ามเพิ่มหมายเหตุ ห้ามอธิบาย ห้ามใช้ [1][2][3]

[ตัวอย่างคำตอบที่ดี]
| เลขที่ | ชื่อ-สกุล | เกรดเฉลี่ย |
|------|----------|-----------|
| 5 | นายเสถียร พุ่มดอก | 1.75 |
| 13 | นายพัฒน์ สิทธิวิทยา | 1.90 |
| 12 | นางสาวมนต์ชญา ภาคภูมิ | 1.98 |
| 6 | นางสาวอมร ศรีสวัสดิ์ | 2.00 |

ตอบเป็นภาษาไทย ต้องแม่นเป๊ะ เรียงตัวเลขให้ถูกต้อง`

// Main entry point
export async function chatWithAI(
  message,
  fileContents = [],
  userApiKey = null,
  provider = 'perplexity'
) {
  try {
    console.log('Using provider: ' + provider)
    console.log('Using ' + (userApiKey ? 'user' : 'system') + ' API key')

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
