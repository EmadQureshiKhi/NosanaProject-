import dotenv from "dotenv";
import { openai } from "@ai-sdk/openai";

// Load environment variables once at the beginning
dotenv.config();

// Export all your environment variables
// Now using OpenAI GPT models instead of Ollama
export const modelName = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
export const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

// Create and export the model instance using OpenAI
export const model = openai(modelName, {
  apiKey: apiKey,
});

console.log(`Using OpenAI Model: ${modelName}`);