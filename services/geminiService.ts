import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CSGModel, CSGPart } from "../types";

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// --- VALIDATION CONFIG ---

const SYSTEM_PROMPT_VALIDATION = `
You are a Senior Engineering Drawing Validator.
Your job is to strictly filter uploaded images.
Analyze the image and determine if it is a valid 2D Engineering/Technical Drawing (e.g., Orthographic projection, Isometric view, Blueprint, Circuit diagram, CAD screenshot, or technical sketch).

Return ONLY JSON:
{
  "isValid": boolean,
  "reason": "Brief explanation why"
}

Rules:
- REJECT photos of real objects, people, landscapes, or text documents.
- REJECT random doodles or non-technical art.
- ACCEPT hand-drawn technical sketches if they look like engineering diagrams.
`;

const validationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN },
    reason: { type: Type.STRING }
  },
  required: ["isValid", "reason"]
};

// --- GENERATION CONFIG ---

const SYSTEM_PROMPT_GENERATION = `
You are a World-Class 3D Engineering CAD Vision System.
Your task is to analyze an engineering drawing (like Oblique Cavalier or Isometric projections) and deconstruct it into a 3D Primitive Tree using Constructive Solid Geometry (CSG).

Analysis Steps:
1.  **Analyze the Global Coordinate System**: Assume the bottom-left corner of the main object is the origin local to the object.
2.  **Identify the Base**: Find the largest primary volume (usually a cube/block).
3.  **Identify Features**: Meticulously list every add-on (protrusions, wedges) and cut-out (holes, slots).
4.  **Extract EXACT Dimensions**: You MUST use the numbers provided in the drawing labels. Do not guess.
    -   Look for arrows and extension lines to see what a number refers to.
    -   "2 HOLES ø10" means two cylinders with diameter 10 (radius 5).
5.  **Calculate Coordinates**:
    -   Position is the CENTER of the primitive.
    -   If a block is 54 wide, and its left edge is at x=0, its center is at x=27.
    -   Carefully calculate offsets for relative parts.

Supported Shapes & Parameters:
-   'cube': dimensions: [width (x), height (y), depth (z)]
-   'cylinder': dimensions: [radius, height, 0] (axis defaults to Y)
-   'sphere': dimensions: [radius, 0, 0]
-   'wedge': dimensions: [width, height, depth] (Right-angled prism)

Operations:
-   'base': The first object.
-   'add': Unions with the previous geometry.
-   'subtract': Removes material from the previous geometry.

Rules:
-   **Wedges**: A wedge's slope defaults to facing "forward". You may need to rotate it [0, 90, 0] or similar to match the drawing.
-   **Holes**: Ensure 'cylinder' primitives used for holes are long enough to cut through the material (e.g., if depth is 20, make hole length 22).
-   **Split View**: The 'explanation' field should describe what this specific part is (e.g., "Main Base Block", "Mounting Hole Left").

Return ONLY valid JSON matching the schema.
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Technical name of the part." },
    parts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["cube", "cylinder", "sphere", "wedge"] },
          operation: { type: Type.STRING, enum: ["base", "add", "subtract"] },
          dimensions: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[w, h, d] or [r, h, 0]" },
          position: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[x, y, z] relative to center" },
          rotation: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[x, y, z] in degrees" },
          explanation: { type: Type.STRING, description: "Detailed logic for this primitive." }
        },
        required: ["type", "operation", "dimensions", "position", "rotation", "explanation"]
      }
    }
  },
  required: ["name", "parts"]
};

// --- FUNCTIONS ---

export async function generate3DModel(imageBase64: string, apiKey: string): Promise<Omit<CSGModel, 'id' | 'timestamp' | 'originalImage'>> {
  const ai = new GoogleGenAI({ apiKey });

  // Extract MIME type and base64 data
  const mimeTypeMatch = imageBase64.match(/^data:([^;]+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
  const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');

  // Step 1: Validation
  try {
    const validationResponse = await ai.models.generateContent({
      model: 'gemini-1.5-flash', // Fast model for check
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: SYSTEM_PROMPT_VALIDATION }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: validationSchema,
        temperature: 0.1,
      }
    });

    const validationResult = JSON.parse(validationResponse.text || "{}");
    if (!validationResult.isValid) {
      throw new Error(`Invalid Image: ${validationResult.reason || "Not an engineering drawing."}`);
    }

  } catch (err: any) {
    // If validation fails logic (isValid=false), rethrow.
    // If API fails, warn and proceed (fail open or closed? Closed is safer, but API glitch shouldn't block. Let's fail open if API error, closed if Logic error)
    if (err.message && err.message.includes("Invalid Image")) {
      throw err;
    }
    console.warn("Validation check failed or skipped, proceeding with caution:", err);
  }

  // Step 2: Generation
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: SYSTEM_PROMPT_GENERATION }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsed = JSON.parse(text);
    const partsWithIds = parsed.parts.map((p: any) => ({ ...p, id: generateId() }));

    return {
      name: parsed.name,
      parts: partsWithIds
    };
  } catch (err) {
    console.error("Gemini Generation Error:", err);
    throw err;
  }
}

export async function createChatSession(apiKey: string, modelContext: CSGModel) {
  const ai = new GoogleGenAI({ apiKey });
  const contextPrompt = `
You are an AI Engineering Tutor. You are currently analyzing a specific engineering drawing.
Model Context:
- Name: ${modelContext.name}
- Number of Features: ${modelContext.parts.length}
- Dimensions/Parts List: ${JSON.stringify(modelContext.parts.map(p => ({ op: p.operation, type: p.type, note: p.explanation }))).substring(0, 1000)}

Your Responsibilities:
1. Explain the geometry and construction of THIS specific model.
2. Clarify engineering terminology related to the drawing.
3. Help the user understand the dimensions and 3D structure.

CRITICAL RULES:
- You must ONLY answer questions directly related to this engineering drawing or engineering concepts.
- If the user asks about unrelated topics (e.g., "Write a poem", "What is the capital of France?", "Fix my code"), you must REFUSE.
- Reply: "I can only assist you with understanding this engineering drawing. Let's focus on the model."
`;
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: { systemInstruction: contextPrompt }
  });
}

export async function generateSpeech(text: string, apiKey: string): Promise<ArrayBuffer> {
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          { text: `Please read the following text aloud naturally: "${text}"` }
        ]
      },
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck'
            }
          }
        }
      } as any
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];

    if (part && 'inlineData' in part && part.inlineData?.data) {
      const binaryString = atob(part.inlineData.data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }

    throw new Error("No audio data returned from Gemini API");
  } catch (err) {
    console.warn("Gemini Speech Generation Error:", err);
    throw err;
  }
}
