/**
 * Firebase Cloud Function: Gemini AI Proxy
 * Proxies Gemini API calls from frontend — keeps the API key server-side.
 * Also handles Sheets export as a secure backend operation.
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ─── Gemini Streaming Proxy ───────────────────────────────────────────────────

export const geminiStream = functions.https.onRequest(
  {
    memory: '512MiB',
    timeoutSeconds: 60,
    cors: [process.env.APP_URL ?? 'https://ecotrack-ai.web.app'],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Verify Firebase ID token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).send('Unauthorized');
      return;
    }

    let uid: string;
    try {
      const token = authHeader.slice(7);
      const decoded = await admin.auth().verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      res.status(401).send('Invalid token');
      return;
    }

    // Check rate limit (20 queries/day)
    const today = new Date().toISOString().split('T')[0];
    const settingsRef = db.doc(`users/${uid}/settings/data`);
    const settings = (await settingsRef.get()).data();
    const count = settings?.dailyAIQueryCount ?? 0;
    const lastDate = settings?.lastAIQueryDate ?? '';

    const effectiveCount = lastDate === today ? count : 0;
    if (effectiveCount >= 20) {
      res.status(429).json({ error: 'Daily AI query limit reached (20/day).' });
      return;
    }

    // Increment counter
    await settingsRef.set(
      { dailyAIQueryCount: effectiveCount + 1, lastAIQueryDate: today },
      { merge: true }
    );

    const { messages, systemPrompt } = req.body;
    if (!messages || !systemPrompt) {
      res.status(400).send('Bad request: missing messages or systemPrompt');
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      safetySettings: SAFETY_SETTINGS,
      systemInstruction: systemPrompt,
    });

    // SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const chat = model.startChat({
        history: messages.slice(0, -1).map((m: any) => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
      });

      const lastMessage = messages[messages.length - 1]?.text ?? '';
      const streamResult = await chat.sendMessageStream(lastMessage);

      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
    } catch (err: any) {
      functions.logger.error('Gemini stream error', err);
      res.write(`data: ${JSON.stringify({ error: 'AI generation failed' })}\n\n`);
    } finally {
      res.end();
    }
  }
);

// ─── Sheets Export Function ───────────────────────────────────────────────────

export const exportToSheets = functions.https.onCall(
  {
    memory: '512MiB',
    cors: [process.env.APP_URL ?? 'https://ecotrack-ai.web.app'],
  },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const { accessToken, period } = request.data;

    if (!accessToken) {
      throw new functions.https.HttpsError('invalid-argument', 'Google OAuth access token required.');
    }

    // Fetch all logs
    const logsSnap = await db
      .collection(`users/${uid}/logs`)
      .orderBy('date', 'desc')
      .get();

    const logs = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Create spreadsheet
    const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
    const createRes = await fetch(SHEETS_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: `EcoTrack Report — ${period}` },
        sheets: [
          { properties: { sheetId: 0, title: 'Carbon Log', index: 0 } },
          { properties: { sheetId: 1, title: 'Summary', index: 1 } },
        ],
      }),
    });

    if (!createRes.ok) {
      throw new functions.https.HttpsError('internal', 'Failed to create spreadsheet.');
    }

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // Write data
    const headerRow = ['Date', 'Category', 'Subcategory', 'Activity', 'kg CO₂e', 'Source'];
    const dataRows = logs.map((l: any) => [
      l.date?.toDate?.()?.toLocaleDateString() ?? '',
      l.category, l.subcategory, l.activity,
      l.kgCO2e?.toFixed(3) ?? '0', l.source,
    ]);

    await fetch(`${SHEETS_API}/${spreadsheetId}/values/A1?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headerRow, ...dataRows] }),
    });

    return { spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` };
  }
);
