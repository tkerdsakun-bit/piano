console.log('Using Groq API for Thai support');

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  throw new Error('Missing Groq API key');
}

export async function chatWithAI(message, fileContents = []) {
  try {
    let context = '';
    if (fileContents.length > 0) {
      context = 'ข้อมูลจากไฟล์ที่อัปโหลด:\n\n';
      fileContents.forEach((file, index) => {
        context += `ไฟล์ที่ ${index + 1}: ${file.name}\n${file.content}\n\n`;
      });
    }

    const prompt = context
      ? `${context}\n\nคำถามของผู้ใช้: ${message}\n\nกรุณาตอบเป็นภาษาไทยโดยอิงจากเนื้อหาในไฟล์ด้านบน`
      : message;

    // ใช้ Llama 3.3 70B - รุ่นใหญ่สุดของ Groq (ฟรี!)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'คุณเป็นผู้ช่วยที่ตอบคำถามเป็นภาษาไทยอย่างชัดเจนและเป็นประโยชน์ โดยอิงจากเอกสารที่ผู้ใช้อัปโหลด'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result.choices[0].message.content || 'ไม่สามารถสร้างคำตอบได้';
    
  } catch (error) {
    console.error('Groq API error:', error);
    throw error;
  }
}
