import OpenAI from "openai";

// Make sure to set OPENAI_API_KEY in your .env file
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function callLLM(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o", // or "gpt-3.5-turbo" if you prefer
    messages: [
      { role: "system", content: "You are a Solana token expert. Write concise, friendly, and accurate token descriptions." },
      { role: "user", content: prompt }
    ],
    max_tokens: 120,
    temperature: 0.7,
  });
  return response.choices[0].message.content?.trim() || "";
}