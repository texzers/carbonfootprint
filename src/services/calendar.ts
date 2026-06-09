import type { Goal } from '../types';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/**
 * Create a recurring Google Calendar event for a goal reminder.
 */
export async function createGoalCalendarEvent(
  goal: Goal,
  accessToken: string
): Promise<string> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Start tomorrow
  startDate.setHours(9, 0, 0, 0); // 9am

  const endDate = new Date(startDate);
  endDate.setHours(9, 15, 0, 0); // 15 minute reminder

  const deadlineDate =
    goal.deadline instanceof Date
      ? goal.deadline
      : (goal.deadline as any).toDate();

  const event = {
    summary: `🌱 ${goal.title}`,
    description: `EcoTrack AI Goal Reminder\n\n${goal.description}\n\nTarget: Reduce by ${goal.targetReduction.toFixed(1)} kg CO₂e/month\nDeadline: ${deadlineDate.toLocaleDateString()}`,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    recurrence: [
      'RRULE:FREQ=WEEKLY;BYDAY=MO', // Every Monday by default
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 1440 }, // Day before
      ],
    },
    colorId: '2', // Sage/green in Google Calendar
  };

  const res = await fetch(CALENDAR_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create calendar event: ${err}`);
  }

  const created = await res.json();
  return created.id;
}

/**
 * Delete a calendar event by ID.
 */
export async function deleteCalendarEvent(
  eventId: string,
  accessToken: string
): Promise<void> {
  const res = await fetch(`${CALENDAR_API}/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 410) {
    throw new Error(`Failed to delete calendar event: ${res.statusText}`);
  }
}

/**
 * Create a weekly check-in event for the EcoTrack digest.
 */
export async function createWeeklyCheckIn(
  userName: string,
  accessToken: string
): Promise<string> {
  const startDate = new Date();
  // Set to next Sunday at 7pm
  const dayOfWeek = startDate.getDay();
  const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
  startDate.setDate(startDate.getDate() + daysUntilSunday);
  startDate.setHours(19, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setHours(19, 30, 0, 0);

  const event = {
    summary: '🌍 EcoTrack Weekly Review',
    description: `Hi ${userName}! Time for your weekly carbon footprint review.\n\nOpen EcoTrack AI to see your progress, log any activities you missed, and get your personalised EcoCoach tips for next week.`,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=SU'],
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 15 }],
    },
    colorId: '2',
  };

  const res = await fetch(CALENDAR_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) throw new Error(`Failed to create weekly check-in: ${res.statusText}`);

  const created = await res.json();
  return created.id;
}
