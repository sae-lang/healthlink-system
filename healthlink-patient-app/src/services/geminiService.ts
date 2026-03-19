import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export interface DiagnosticResult {
  condition: string;
  recommendation: string;
  triageLevel: 'emergency' | 'urgent' | 'routine' | 'self-care';
}

export async function analyzeSymptomsAI(symptoms: string[], customText: string, language: string = 'en'): Promise<DiagnosticResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const prompt = `
    You are a medical diagnostic assistant. Analyze the following symptoms and provide a potential condition, recommendation, and triage level.
    
    CRITICAL: You MUST provide a specific potential condition. DO NOT return "Unknown", "General Illness", or "N/A". Based on the symptoms provided, what is the most likely medical condition?
    
    Symptoms: ${symptoms.join(", ")}
    Additional Notes: ${customText}
    Language: ${language === 'en' ? 'English' : 'Swahili'}

    Triage Levels:
    - emergency: Seek care immediately (Life-threatening)
    - urgent: Visit clinic soon (Needs attention within 24-48 hours)
    - routine: Visit clinic when possible (Non-urgent)
    - self-care: Home care / Monitor (Minor issues)

    Provide the response in JSON format with fields: condition, recommendation, triageLevel.
    The condition and recommendation should be in the specified language (${language === 'en' ? 'English' : 'Swahili'}).
    The "condition" field MUST contain the name of a specific medical condition.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional medical diagnostic assistant. Your goal is to analyze symptoms and provide the most likely specific medical condition. Never return 'Unknown' or vague answers. Always provide a specific diagnosis even if it is a 'Potential' one. Be direct and concise.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            condition: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            triageLevel: { 
              type: Type.STRING,
              enum: ["emergency", "urgent", "routine", "self-care"]
            }
          },
          required: ["condition", "recommendation", "triageLevel"]
        }
      }
    });

    const text = response.text || "{}";
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanedText);
    return {
      condition: result.condition || "Unknown",
      recommendation: result.recommendation || "Please consult a professional.",
      triageLevel: result.triageLevel || "routine"
    };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      condition: "Analysis Error",
      recommendation: "There was an error analyzing your symptoms with AI. Please try again or consult a professional.",
      triageLevel: "routine"
    };
  }
}
