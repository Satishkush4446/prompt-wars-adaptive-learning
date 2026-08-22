import { GoogleGenAI } from "@google/genai";

// Uses GEMINI_API_KEY from environment. Run with:
// GEMINI_API_KEY=your-key npx tsx scripts/list-models.ts
const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable is not set.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function main() {
  const candidates = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];

  for (const model of candidates) {
    try {
      console.log(`\nTrying model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: "Say hello",
      });
      console.log(`✅ ${model} WORKS! Response: ${response.text?.slice(0, 60)}`);
      break;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.log(`❌ ${model}: ${msg.slice(0, 150)}`);
    }
  }
}

main();
