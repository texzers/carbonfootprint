/**
 * Firebase Cloud Function: Carbon Score Computation
 * Triggered on Firestore write to users/{uid}/logs/{logId}.
 * Recomputes and caches the user's carbon score.
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

const SCORE_THRESHOLDS = {
  excellent: 3.0,
  good: 6.0,
  average: 12.0,
  high: 19.0,
};

const TARGET_1_5C_KG_YEAR = 2300;

// ─── Triggered on log write ───────────────────────────────────────────────────

export const onLogWritten = functions.firestore.onDocumentWritten(
  {
    document: 'users/{uid}/logs/{logId}',
    memory: '256MiB',
  },
  async (event) => {
    const uid = event.params.uid;

    try {
      await recomputeScore(uid);
    } catch (err) {
      functions.logger.error(`Score recomputation failed for ${uid}`, err);
    }
  }
);

async function recomputeScore(uid: string): Promise<void> {
  const now = Date.now();
  const weekAgo = admin.firestore.Timestamp.fromDate(new Date(now - 7 * 24 * 60 * 60 * 1000));
  const monthAgo = admin.firestore.Timestamp.fromDate(new Date(now - 30 * 24 * 60 * 60 * 1000));
  const prevWeekStart = admin.firestore.Timestamp.fromDate(new Date(now - 14 * 24 * 60 * 60 * 1000));

  // Get monthly logs
  const monthlyLogsSnap = await db
    .collection(`users/${uid}/logs`)
    .where('date', '>=', monthAgo)
    .get();

  const allLogs = monthlyLogsSnap.docs.map((d) => d.data());

  const weeklyTotal = allLogs
    .filter((l) => l.date?.toDate?.() >= weekAgo.toDate())
    .reduce((s, l) => s + (l.kgCO2e ?? 0), 0);

  const prevWeekTotal = allLogs
    .filter((l) => {
      const date = l.date?.toDate?.();
      return date >= prevWeekStart.toDate() && date < weekAgo.toDate();
    })
    .reduce((s, l) => s + (l.kgCO2e ?? 0), 0);

  const daily = weeklyTotal / 7;
  const annual = daily * 365;

  let rating: string;
  if (daily < SCORE_THRESHOLDS.excellent) rating = 'excellent';
  else if (daily < SCORE_THRESHOLDS.good) rating = 'good';
  else if (daily < SCORE_THRESHOLDS.average) rating = 'average';
  else if (daily < SCORE_THRESHOLDS.high) rating = 'high';
  else rating = 'very_high';

  let trend: string = 'stable';
  if (weeklyTotal < prevWeekTotal * 0.95) trend = 'improving';
  else if (weeklyTotal > prevWeekTotal * 1.05) trend = 'worsening';

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  for (const log of allLogs) {
    const cat = log.category ?? 'other';
    categoryTotals[cat] = (categoryTotals[cat] ?? 0) + (log.kgCO2e ?? 0);
  }

  // Cache score in Firestore for fast dashboard reads
  await db.doc(`users/${uid}/cache/score`).set({
    daily,
    weekly: weeklyTotal,
    annual,
    rating,
    trend,
    categoryTotals,
    vs1_5CTarget: ((annual - TARGET_1_5C_KG_YEAR) / TARGET_1_5C_KG_YEAR) * 100,
    computedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ─── HTTP Function: Manual score refresh ─────────────────────────────────────

export const refreshScore = functions.https.onCall(
  {
    memory: '256MiB',
    cors: [process.env.APP_URL ?? 'https://ecotrack-ai.web.app'],
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    await recomputeScore(uid);
    return { success: true };
  }
);
