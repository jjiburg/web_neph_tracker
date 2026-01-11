import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `You are a health logging assistant for a nephrostomy patient. Parse the user's voice command and return JSON.

Supported actions:
- intake: Fluid intake (drinking water, coffee, etc). Requires amountMl.
- output: Urine output. Requires amountMl and type ("bag" or "void").
  - type "bag": nephrostomy bag, neph bag, bag output, from the tube
  - type "void": natural output, normal void, peed, urinated, bathroom, toilet, voided
- flush: Tube flush with saline. amountMl optional (default 30).
- bowel: Bowel movement. bristolScale optional (1-7).
- dressing: Dressing check. State should be "Checked", "Needs Changing", or "Changed Today".

Examples:
- "add 300ml hydration" → {"action":"intake","amount":300}
- "drank 500ml water" → {"action":"intake","amount":500}
- "log 500ml bag output" → {"action":"output","type":"bag","amount":500}
- "300ml from the neph bag" → {"action":"output","type":"bag","amount":300}
- "voided 100ml" → {"action":"output","type":"void","amount":100}
- "natural output 200ml" → {"action":"output","type":"void","amount":200}
- "peed 150ml" → {"action":"output","type":"void","amount":150}
- "did a flush" → {"action":"flush","amount":30}
- "bowel movement type 4" → {"action":"bowel","bristolScale":4}
- "dressing looks good" → {"action":"dressing","state":"Checked"}

Return ONLY valid JSON with these fields: action (required), type, amount, bristolScale, state, note.
If the command is unclear or unrelated, return: {"error":"Could not understand command"}`;

const INSIGHTS_PROMPT = `You are a health logging assistant for nephrostomy care.
You will receive a JSON payload for either a daily snapshot or a date range.

Your job:
- Surface accurate, practical insights from the data (no diagnosis).
- Use the provided numbers for goals/projections; do not invent measurements.
- Be specific (mention timing patterns, gaps, counts, and notable symptoms/notes).

Return ONLY valid JSON matching this shape:
{
  "headline": string,
  "goalStatus": {
    "intake": { "status": "no_goal"|"behind"|"on_track"|"met"|"over", "reason": string },
    "output": { "status": "no_goal"|"behind"|"on_track"|"met"|"over", "reason": string }
  },
  "highlights": [ { "severity": "info"|"warning"|"urgent", "title": string, "detail": string } ],
  "patterns": [ { "title": string, "detail": string } ],
  "nextActions": [ { "title": string, "detail": string } ],
  "questions": [ string ]
}

Guidelines:
- Keep strings short and scannable.
- Prefer 3-6 highlights, up to 3 patterns, up to 3 nextActions, up to 2 questions.
- Treat fever + low output or new severe pain as higher priority to mention, but do not diagnose.
- If data is sparse, say that and ask 1 clarifying question.
- If no goals are set, set goalStatus.*.status = "no_goal" and explain what a goal would enable.
- If scope is "range", summarize consistency, variability, and goal adherence across days.`;

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

export async function handleDailyInsights(req, res) {
    console.log('[INSIGHTS] === New insights request ===');

    try {
        const payload = req.body || {};

        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({ error: 'Missing insights payload' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent([
            { text: INSIGHTS_PROMPT },
            { text: `Daily data (JSON):\n${JSON.stringify(payload, null, 2)}` },
            { text: 'Return the JSON now.' }
        ]);

        const response = await result.response;
        const text = response.text();
        console.log('[INSIGHTS] Raw response text:', text);

        let jsonStr = text.trim();
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        const parsed = JSON.parse(jsonStr);
        const defaultGoalStatus = {
            intake: { status: 'no_goal', reason: 'No intake goal set yet.' },
            output: { status: 'no_goal', reason: 'No output goal set yet.' }
        };
        const normalized = (() => {
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return {
                    headline: typeof parsed === 'string' ? parsed : 'Daily insights ready',
                    goalStatus: defaultGoalStatus,
                    highlights: [],
                    patterns: [],
                    nextActions: [],
                    questions: [],
                };
            }
            return {
                headline: parsed.headline || 'Daily insights ready',
                goalStatus: parsed.goalStatus || defaultGoalStatus,
                highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
                patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
                nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions : [],
                questions: Array.isArray(parsed.questions) ? parsed.questions : [],
            };
        })();

        res.json({ insight: normalized });
    } catch (error) {
        console.error('[INSIGHTS] === ERROR ===');
        console.error('[INSIGHTS] Error name:', error.name);
        console.error('[INSIGHTS] Error message:', error.message);
        console.error('[INSIGHTS] Error stack:', error.stack);

        let errorMessage = 'Failed to generate insights';
        if (error.message.includes('API_KEY')) {
            errorMessage = 'Invalid API key';
        } else if (error.message.includes('PERMISSION_DENIED')) {
            errorMessage = 'API permission denied';
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
    console.log('[INSIGHTS] Setting up /api/insights route');
    app.post('/api/insights', handleDailyInsights);
}
