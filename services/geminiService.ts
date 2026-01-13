
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function scanReceipt(base64Image: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
            { text: "Extract receipt data: total amount, currency, and items. Try to guess the category (Food, Transport, Hotel, etc.)." }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["description", "amount", "currency", "category"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini OCR failed:", error);
    return null;
  }
}
