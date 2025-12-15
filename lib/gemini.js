console.log('Using Hugging Face Inference API (Direct)');

const apiKey = process.env.HUGGINGFACE_API_KEY;
if (!apiKey) {
  throw new Error('Missing Hugging Face API key');
}

export async function chatWithAI(message, fileContents = []) {
  try {
    let context = '';
    if (fileContents.length > 0) {
      context = 'ข้อมูลจากไฟล์ที่อัปโหลด:\n\n';
      fileContents.forEach((file, index) => {
        // ตัดไฟล์ยาวๆ ให้สั้นลงหน่อย
        const shortContent = file.content.substring(0, 10000);
        const isTruncated = file.content.length > 10000;
        context += `ไฟล์ที่ ${index + 1}: ${file.name}\n${shortContent}${isTruncated ? '\n...(มีเนื้อหาต่ออีก)' : ''}\n\n`;
      });
    }

    const prompt = context
      ? `${context}\n\nคำถามของผู้ใช้: ${message}\n\nกรุณาตอบเป็นภาษาไทยโดยอิงจากเนื้อหาในไฟล์ด้านบน`
      : `กรุณาตอบคำถามนี้เป็นภาษาไทย: ${message}`;

    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [
          {
            role: 'system',
            content: 'คุณเป็นผู้ช่วยที่ตอบคำถามเป็นภาษาไทยอย่างชัดเจน'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 512,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result.choices[0].message.content || 'ไม่สามารถสร้างคำตอบได้';
    
  } catch (error) {
    console.error('Hugging Face API error:', error);
    throw error;
  }
}
