import { GoogleGenerativeAI } from '@google/generative-ai';

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
    console.log('[VOICE] === New voice request ===');

    try {
        const { audio, mimeType } = req.body;

        // Log request info
        console.log('[VOICE] mimeType:', mimeType);
        console.log('[VOICE] audio length:', audio ? audio.length : 'NO AUDIO');
        console.log('[VOICE] audio preview:', audio ? audio.substring(0, 100) + '...' : 'N/A');

        if (!audio) {
            console.log('[VOICE] ERROR: No audio provided');
            return res.status(400).json({ error: 'No audio provided' });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.log('[VOICE] ERROR: GEMINI_API_KEY not set');
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        console.log('[VOICE] API key present:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');

        // Initialize Gemini
        console.log('[VOICE] Initializing Gemini client...');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        console.log('[VOICE] Sending request to Gemini...');

        const result = await model.generateContent([
            { text: SYSTEM_PROMPT },
            {
                inlineData: {
                    mimeType: mimeType || 'audio/webm',
                    data: audio
                }
            },
            { text: 'Parse this voice command and return JSON:' }
        ]);

        console.log('[VOICE] Gemini response received');

        const response = await result.response;
        const text = response.text();

        console.log('[VOICE] Raw response text:', text);

        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = text.trim();
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
            console.log('[VOICE] Extracted from code block:', jsonStr);
        }

        const parsed = JSON.parse(jsonStr);
        console.log('[VOICE] Parsed JSON:', JSON.stringify(parsed));

        res.json(parsed);

    } catch (error) {
        console.error('[VOICE] === ERROR ===');
        console.error('[VOICE] Error name:', error.name);
        console.error('[VOICE] Error message:', error.message);
        console.error('[VOICE] Error stack:', error.stack);

        // More specific error messages
        let errorMessage = 'Failed to process voice command';
        if (error.message.includes('API_KEY')) {
            errorMessage = 'Invalid API key';
        } else if (error.message.includes('PERMISSION_DENIED')) {
            errorMessage = 'API permission denied';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'Could not parse response';
        } else if (error.message.includes('audio')) {
            errorMessage = 'Audio format error';
        }

        res.status(500).json({
            error: errorMessage,
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
}

export default function setupVoiceRoutes(app) {
    console.log('[VOICE] Setting up /api/voice route');
    app.post('/api/voice', handleVoiceCommand);
}
