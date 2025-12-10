import { OpenAI } from 'openai';  // Correct import

console.log('Using OpenAI SDK');

// Ensure API key is available from environment variables
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('Missing OpenAI API key');
}

// Correct instantiation of OpenAI client without organization
const openai = new OpenAI({
  apiKey: apiKey,
});

export async function chatWithAI(message, fileContents = []) {
  try {
    // Build context from files if they exist
    let context = '';
    if (fileContents.length > 0) {
      context = 'Here are the contents of the uploaded files:\n\n';
      fileContents.forEach((file, index) => {
        context += `File ${index + 1}: ${file.name}\n${file.content}\n\n`;
      });
    }

    // Create the prompt based on context and user message
    const prompt = context
      ? `${context}\n\nUser question: ${message}\n\nPlease answer based on the file contents above.`
      : message;

    // Send the prompt to OpenAI's GPT model and get the response
    const result = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // You can switch this to 'gpt-4' if you have access to it
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Return the response from OpenAI
    return result.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}
