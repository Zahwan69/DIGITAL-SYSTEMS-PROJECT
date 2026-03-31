import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(geminiApiKey);

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});
