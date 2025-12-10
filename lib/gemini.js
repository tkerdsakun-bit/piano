import { OpenAI } from 'openai';  // Correct import

console.log('Using OpenAI SDK');

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('Missing OpenAI API key');
}

// Correct instantiation of OpenAI client
const openai = new OpenAI({
  apiKey: apiKey,
  organization: process.env.OPENAI_ORG_ID, // Optional: if you're using an organization
});

export async function chatWithAI(message, fileContents = []) {
  try {
    // Prepare the context from files
    let context = '';
    if (fileContents.length > 0) {
      context = 'Here are the contents of the uploaded files:\n\n';
      fileContents.forEach((file, index) => {
        context += `File ${index + 1}: ${file.name}\n${file.content}\n\n`;
      });
    }

    // Create the prompt based on context and the user's message
    const prompt = context
      ? `${context}\n\nUser question: ${message}\n\nPlease answer based on the file contents above.`
      : message;

    // Send the prompt to OpenAI's GPT model and get the response
    const result = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // You can choose GPT-4 if you have access
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract and return the response text
    return result.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}
