import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { AIContext, ChatMessage, SuggestedAction, CategoryType } from '../types';

// ─── Client initialised lazily via Cloud Function proxy ──────────────────────
// The Gemini API key is NEVER exposed in the frontend.
// For demo/development, we use a Cloud Function endpoint as a proxy.

const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL ?? '/api/gemini';

// ─── System Prompt Builder ────────────────────────────────────────────────────

export function buildSystemPrompt(ctx: AIContext): string {
  return `You are EcoCoach, a warm, knowledgeable climate assistant integrated into EcoTrack AI. Your role is to help ${ctx.userName} reduce their carbon footprint in practical, achievable ways.

User context:
- Location: ${ctx.country}, ${ctx.city}
- This week's footprint: ${ctx.weeklyTotal.toFixed(1)} kg CO₂e
- Highest impact category: ${ctx.topCategory} (${ctx.topCategoryKg.toFixed(1)} kg this month)
- Monthly trend: ${ctx.trend}
- Active goals: ${ctx.goals.length > 0 ? ctx.goals.join(', ') : 'None set yet'}
- Diet: ${ctx.dietType.replace(/_/g, ' ')}, Primary transport: ${ctx.primaryTransport.replace(/_/g, ' ')}
- National average for ${ctx.country}: ${ctx.nationalAvg.toLocaleString()} kg/year
- 1.5°C compatible budget: 2,300 kg/year

Rules:
1. Always be encouraging, never shame or guilt-trip
2. Give specific, quantified actions with CO₂ savings (e.g., "saves ~0.8 kg CO₂e per day")
3. Reference the user's actual data, not generic advice
4. Keep responses under 200 words unless the user asks for more detail
5. Suggest one priority action per response unless asked for multiple
6. Cite data sources briefly (e.g., "Source: IPCC AR6", "Source: DEFRA 2023")
7. Use encouraging language: "Great that you're tracking this!", "You're making real progress!"
8. If asked about comparisons, be factual but compassionate
9. Format responses with clear structure using markdown (bullets, bold) when helpful
10. Never invent data — if you don't know something, say so honestly`;
}

// ─── Suggested Actions (rule-based fallback) ──────────────────────────────────

export function getRuleBasedSuggestions(ctx: AIContext): SuggestedAction[] {
  const suggestions: SuggestedAction[] = [];

  if (ctx.topCategory === 'transport' && ctx.primaryTransport.includes('car')) {
    suggestions.push({
      id: 'ev-switch',
      category: 'transport',
      title: 'Switch to an electric vehicle',
      description: `Replacing your ${ctx.primaryTransport.replace('_', ' ')} with an EV could save significant emissions.`,
      annualSavingKg: 1200,
      effort: 'high',
      impact: 'high',
      source: 'rule',
    });
    suggestions.push({
      id: 'car-free-days',
      category: 'transport',
      title: 'Go car-free 2 days per week',
      description: 'Use public transport, cycling, or walking for 2 days a week.',
      annualSavingKg: 420,
      effort: 'medium',
      impact: 'medium',
      source: 'rule',
    });
  }

  if (ctx.topCategory === 'food' && ctx.dietType.includes('meat')) {
    suggestions.push({
      id: 'reduce-meat',
      category: 'food',
      title: 'Reduce meat to 3 days/week',
      description: 'Cutting meat consumption is one of the most impactful dietary changes.',
      annualSavingKg: 480,
      effort: 'low',
      impact: 'high',
      source: 'rule',
    });
  }

  if (ctx.topCategory === 'energy') {
    suggestions.push({
      id: 'green-tariff',
      category: 'energy',
      title: 'Switch to a renewable energy tariff',
      description: 'Move to a 100% renewable electricity provider.',
      annualSavingKg: 660,
      effort: 'low',
      impact: 'high',
      source: 'rule',
    });
  }

  if (ctx.topCategory === 'travel') {
    suggestions.push({
      id: 'no-fly',
      category: 'travel',
      title: 'Replace one flight with train travel',
      description: 'A typical flight emits 10-40x more CO₂ than an equivalent train journey.',
      annualSavingKg: 800,
      effort: 'medium',
      impact: 'high',
      source: 'rule',
    });
  }

  // Always suggest if not already tracking
  if (!suggestions.length) {
    suggestions.push({
      id: 'track-consistently',
      category: ctx.topCategory,
      title: 'Track daily for 2 weeks for better insights',
      description: 'Consistent tracking reveals patterns and helps EcoCoach give you personalised tips.',
      annualSavingKg: 200,
      effort: 'low',
      impact: 'medium',
      source: 'rule',
    });
  }

  return suggestions.slice(0, 3);
}

// ─── Streaming Chat via Proxy ─────────────────────────────────────────────────

export async function* streamGeminiResponse(
  messages: Array<{ role: 'user' | 'model'; text: string }>,
  systemPrompt: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const clientApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (clientApiKey && clientApiKey !== 'your_gemini_api_key_here' && clientApiKey.startsWith('AIzaSy')) {
    try {
      const genAI = new GoogleGenerativeAI(clientApiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-pro',
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
        systemInstruction: systemPrompt,
      });

      const chat = model.startChat({
        history: messages.slice(0, -1).map((m: any) => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
      });

      const lastMessage = messages[messages.length - 1]?.text ?? '';
      const streamResult = await chat.sendMessageStream(lastMessage);

      for await (const chunk of streamResult.stream) {
        if (signal?.aborted) throw new Error('AbortError');
        const text = chunk.text();
        if (text) yield text;
      }
      return;
    } catch (err) {
      console.error('Client-side Gemini streaming failed, falling back to proxy:', err);
    }
  }

  const response = await fetch(`${PROXY_URL}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt }),
    signal,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini proxy error: ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // Parse SSE format
    const lines = chunk.split('\n').filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.slice(6));
          if (json.text) yield json.text;
        } catch {
          // partial chunk, skip
        }
      }
    }
  }
}

// ─── Cached Fallback Tips ─────────────────────────────────────────────────────

export const CACHED_TIPS: Record<CategoryType, string[]> = {
  transport: [
    '🚂 Trains emit ~80% less CO₂ than flying for the same journey. Consider rail for trips under 600km.',
    '🚴 Cycling just 3 days/week instead of driving saves ~600 kg CO₂ per year (Source: DEFRA 2023).',
    '🚌 Switching one car commute to public transport per week saves ~0.8 kg CO₂e per trip.',
    '⚡ EVs charged on a UK grid produce 73% less lifecycle emissions than a petrol car (Source: IPCC AR6).',
  ],
  energy: [
    '🌿 Switching to a green energy tariff can eliminate ~2 tonnes of CO₂ from your home energy each year.',
    '🌡️ Reducing your thermostat by 1°C saves ~300 kg CO₂/year and 8% on heating bills (Source: EST).',
    '💡 LED bulbs use 75% less energy than incandescent and last 25x longer.',
    '🔌 Standby appliances account for ~10% of household electricity use. Unplugging saves ~50 kg CO₂/year.',
  ],
  food: [
    '🥗 Switching from a meat-heavy to vegetarian diet for just one day per week saves ~530 kg CO₂/year.',
    '🍽️ Food waste is responsible for 8-10% of global greenhouse gas emissions. Meal planning reduces this significantly.',
    '🥦 Seasonal, locally grown produce can cut food-related transport emissions by up to 15%.',
    '🌱 Plant-based diets have, on average, half the carbon footprint of meat-heavy diets (Source: Poore & Nemecek 2018).',
  ],
  shopping: [
    '👗 The fashion industry emits more carbon than aviation and shipping combined. Buying secondhand helps.',
    '📱 Keeping your phone for 4 years instead of 2 halves its lifecycle carbon footprint.',
    '🛒 Buying 10 fewer new items of clothing per year saves ~220 kg CO₂e (Source: WRAP 2022).',
    '♻️ Repairing electronics instead of replacing them can avoid significant manufacturing emissions.',
  ],
  travel: [
    '✈️ A return flight London-New York generates ~1.6 tonnes CO₂e — equivalent to 3 months of an average UK diet.',
    '🌍 Staying closer to home for holidays is the single biggest travel carbon action.',
    '🎒 When flying is necessary, choosing economy reduces per-person emissions vs business class by up to 3x.',
    '🏕️ Staycations create rich memories with a fraction of the carbon footprint of international travel.',
  ],
};

export function getCachedTip(category: CategoryType): string {
  const tips = CACHED_TIPS[category];
  return tips[Math.floor(Math.random() * tips.length)];
}
