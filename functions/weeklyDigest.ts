/**
 * Firebase Cloud Function: Weekly Digest Email
 * Scheduled every Sunday at 6pm via Cloud Scheduler.
 * Sends personalised carbon summary email using SendGrid.
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

interface WeeklySummary {
  displayName: string;
  email: string;
  totalKgCO2e: number;
  vsLastWeek: number;
  topCategory: string;
  streak: number;
}

// ─── Scheduled Function (every Sunday 18:00 UTC) ──────────────────────────────

export const weeklyDigest = functions.scheduler.onSchedule(
  {
    schedule: '0 18 * * 0', // Every Sunday at 18:00 UTC
    timeZone: 'UTC',
    memory: '512MiB',
  },
  async () => {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    const now = admin.firestore.Timestamp.now();
    const weekAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const twoWeeksAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    );

    // Get all users with weekly digest enabled
    const usersSnap = await db.collectionGroup('profile').get();

    const emailPromises: Promise<void>[] = [];

    for (const profileDoc of usersSnap.docs) {
      try {
        const uid = profileDoc.ref.parent.parent?.id;
        if (!uid) continue;

        const profile = profileDoc.data();
        if (!profile.email) continue;

        // Check notification settings
        const settingsDoc = await db.doc(`users/${uid}/settings/data`).get();
        const settings = settingsDoc.data();
        if (!settings?.notifications?.weeklyDigest) continue;

        // Get this week's logs
        const thisWeekLogs = await db
          .collection(`users/${uid}/logs`)
          .where('date', '>=', weekAgo)
          .where('date', '<=', now)
          .get();

        // Get last week's logs
        const lastWeekLogs = await db
          .collection(`users/${uid}/logs`)
          .where('date', '>=', twoWeeksAgo)
          .where('date', '<', weekAgo)
          .get();

        const thisWeekTotal = thisWeekLogs.docs.reduce(
          (s, d) => s + (d.data().kgCO2e ?? 0), 0
        );
        const lastWeekTotal = lastWeekLogs.docs.reduce(
          (s, d) => s + (d.data().kgCO2e ?? 0), 0
        );

        // Find top category
        const categoryTotals: Record<string, number> = {};
        for (const log of thisWeekLogs.docs) {
          const cat = log.data().category ?? 'other';
          categoryTotals[cat] = (categoryTotals[cat] ?? 0) + log.data().kgCO2e;
        }
        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';
        const vsLastWeek = lastWeekTotal > 0
          ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
          : 0;

        const summary: WeeklySummary = {
          displayName: profile.displayName ?? 'EcoTracker',
          email: profile.email,
          totalKgCO2e: thisWeekTotal,
          vsLastWeek,
          topCategory,
          streak: 0, // Simplified for Cloud Function
        };

        emailPromises.push(sendDigestEmail(summary));
      } catch (err) {
        functions.logger.error(`Failed to process user digest`, err);
      }
    }

    await Promise.allSettled(emailPromises);
    functions.logger.info(`Weekly digest sent to ${emailPromises.length} users`);
  }
);

async function sendDigestEmail(summary: WeeklySummary): Promise<void> {
  const trend = summary.vsLastWeek < 0 ? '↓ improving' : summary.vsLastWeek > 0 ? '↑ higher' : '→ same';
  const trendColor = summary.vsLastWeek < 0 ? '#40916C' : '#E76F51';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly EcoTrack Report</title>
</head>
<body style="font-family: Inter, Arial, sans-serif; background: #F8F9FA; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 32px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1B4332, #40916C); padding: 32px; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 8px;">🌍</div>
      <h1 style="color: white; font-size: 24px; margin: 0 0 4px;">EcoTrack AI</h1>
      <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 14px;">Your weekly carbon report</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <p style="color: #1A1A2E; font-size: 16px;">Hi ${summary.displayName},</p>
      <p style="color: #6C757D; font-size: 14px;">Here's your carbon footprint summary for the past 7 days.</p>

      <!-- Main metric -->
      <div style="text-align: center; background: #D8F3DC; border-radius: 16px; padding: 24px; margin: 24px 0;">
        <p style="color: #40916C; font-size: 13px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Total this week</p>
        <p style="font-size: 48px; font-weight: 800; color: #1B4332; margin: 0; font-family: monospace;">
          ${summary.totalKgCO2e.toFixed(1)}
        </p>
        <p style="color: #40916C; margin: 4px 0 0; font-size: 14px;">kg CO₂e</p>
      </div>

      <!-- Trend -->
      <div style="display: flex; gap: 12px; margin: 16px 0;">
        <div style="flex: 1; background: #F8F9FA; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #6C757D; font-size: 12px; margin: 0 0 4px; text-transform: uppercase;">vs last week</p>
          <p style="color: ${trendColor}; font-size: 20px; font-weight: 700; margin: 0;">
            ${summary.vsLastWeek > 0 ? '+' : ''}${summary.vsLastWeek.toFixed(1)}%
          </p>
          <p style="color: ${trendColor}; font-size: 12px; margin: 4px 0 0;">${trend}</p>
        </div>
        <div style="flex: 1; background: #F8F9FA; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #6C757D; font-size: 12px; margin: 0 0 4px; text-transform: uppercase;">Top category</p>
          <p style="color: #1A1A2E; font-size: 18px; font-weight: 700; margin: 0; text-transform: capitalize;">${summary.topCategory}</p>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0 16px;">
        <a href="${process.env.APP_URL ?? 'https://ecotrack-ai.web.app'}"
          style="background: #40916C; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 14px; display: inline-block;">
          View full report in EcoTrack AI →
        </a>
      </div>

      <p style="color: #6C757D; font-size: 12px; text-align: center;">
        You're receiving this because you have weekly digests enabled.<br>
        <a href="${process.env.APP_URL}/settings" style="color: #40916C;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;

  await sgMail.send({
    to: summary.email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL ?? 'noreply@ecotrack-ai.com',
      name: 'EcoTrack AI',
    },
    subject: `🌍 Your weekly carbon report — ${summary.totalKgCO2e.toFixed(1)} kg CO₂e`,
    html,
    trackingSettings: { clickTracking: { enable: false } },
  });
}
