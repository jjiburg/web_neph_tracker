import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are a health logging assistant for a nephrostomy patient. Parse the user's voice command and return JSON.

Supported actions:
- intake: Fluid intake (drinking water, coffee, etc). Requires amountMl.
- output: Urine output from nephrostomy bag or normal voiding. Requires amountMl and type ("bag" or "void").
- flush: Tube flush with saline. amountMl optional (default 30).
- bowel: Bowel movement. bristolScale optional (1-7).
- dressing: Dressing check. State should be "Checked", "Needs Changing", or "Changed Today".

Examples:
- "add 300ml hydration" → {"action":"intake","amount":300}
- "log 500ml bag output" → {"action":"output","type":"bag","amount":500}
- "voided 100ml" → {"action":"output","type":"void","amount":100}
- "did a flush" → {"action":"flush","amount":30}
- "bowel movement type 4" → {"action":"bowel","bristolScale":4}
- "dressing looks good" → {"action":"dressing","state":"Checked"}

Return ONLY valid JSON with these fields: action (required), type, amount, bristolScale, state, note.
If the command is unclear or unrelated, return: {"error":"Could not understand command"}`;

export async function handleVoiceCommand(req, res) {
    try {
        const { audio, mimeType } = req.body;

        if (!audio) {
            return res.status(400).json({ error: 'No audio provided' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: SYSTEM_PROMPT },
                        {
                            inlineData: {
                                mimeType: mimeType || 'audio/webm',
                                data: audio
                            }
                        },
                        { text: 'Parse this voice command and return JSON:' }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 256,
            }
        });

        const text = response.text.trim();

        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        const parsed = JSON.parse(jsonStr);
        res.json(parsed);

    } catch (error) {
        console.error('Voice processing error:', error);
        res.status(500).json({ error: 'Failed to process voice command' });
    }
}

export default function setupVoiceRoutes(app) {
    app.post('/api/voice', handleVoiceCommand);
}
