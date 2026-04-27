import { GoogleGenAI } from "@google/genai";

let _client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY が設定されていません");
    }
    _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _client;
}
