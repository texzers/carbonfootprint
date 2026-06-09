import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  UserProfile,
  UserSettings,
  CarbonLog,
  Goal,
  PaginatedResult,
} from '../types';

// ─── Helper: sanitize for Firestore ──────────────────────────────────────────

function sanitize<T extends object>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

// ─── Demo / In-Memory Mock Fallback Mode ──────────────────────────────────────
let demoProfile: UserProfile | null = null;
let demoSettings: UserSettings | null = null;
let demoLogs: CarbonLog[] = [];
let demoGoals: Goal[] = [];

const logListeners = new Set<(logs: CarbonLog[]) => void>();
const goalListeners = new Set<(goals: Goal[]) => void>();

function notifyLogListeners() {
  logListeners.forEach((cb) => cb([...demoLogs]));
}
function notifyGoalListeners() {
  goalListeners.forEach((cb) => cb([...demoGoals]));
}

function getInitialDemoProfile(): UserProfile {
  return {
    uid: 'demo-user',
    displayName: 'Demo User',
    email: 'demo@ecotrack.ai',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
    country: 'United Kingdom',
    city: 'London',
    dietType: 'medium_meat',
    primaryTransport: 'petrol_car',
    householdSize: 2,
    homeSize: 85,
    hasGreenTariff: false,
    gridRegion: 'uk',
    createdAt: new Date(),
    onboardingComplete: true,
    onboardingStep: 4,
  };
}

function getInitialDemoSettings(): UserSettings {
  return {
    units: 'metric',
    theme: 'system',
    notifications: {
      weeklyDigest: true,
      dailyTip: true,
      goalReminders: true,
      email: 'demo@ecotrack.ai',
    },
    connectedServices: {
      googleCalendar: false,
      googleSheets: false,
    },
    dailyAIQueryCount: 5,
    lastAIQueryDate: new Date().toISOString().split('T')[0],
  };
}

function generateMockLogs(): CarbonLog[] {
  const logs: CarbonLog[] = [];
  const now = new Date();
  
  const transportMeta = [
    { subcategory: 'petrol_car', activity: 'Commute (petrol car)', kgCO2e: 8.5 },
    { subcategory: 'train', activity: 'Train to client site', kgCO2e: 1.2 },
    { subcategory: 'bus', activity: 'Bus to city center', kgCO2e: 0.9 },
  ];
  const foodMeta = [
    { subcategory: 'medium_meat', activity: 'Diet: Meat-eater', kgCO2e: 5.63 },
    { subcategory: 'vegetarian', activity: 'Diet: Vegetarian day', kgCO2e: 3.81 },
    { subcategory: 'vegan', activity: 'Diet: Vegan day', kgCO2e: 2.89 },
  ];
  const shoppingMeta = [
    { subcategory: 'goods', activity: 'Purchased clothing items', kgCO2e: 44 },
    { subcategory: 'goods', activity: 'Online grocery delivery', kgCO2e: 3.2 },
  ];

  for (let i = 0; i < 14; i++) {
    const logDate = new Date();
    logDate.setDate(now.getDate() - i);
    
    // Log energy
    logs.push({
      id: `demo-log-energy-${i}`,
      date: logDate,
      category: 'energy',
      subcategory: 'gas',
      activity: 'Home energy (gas + electricity)',
      kgCO2e: 5.2 + Math.random() * 3,
      source: 'manual',
      metadata: { kwh: 150, heatingType: 'gas', heatingKwh: 80, occupants: 2, greenTariff: false, gridRegion: 'uk' }
    });

    // Log food
    const foodIndex = i % 3;
    const food = foodMeta[foodIndex];
    logs.push({
      id: `demo-log-food-${i}`,
      date: logDate,
      category: 'food',
      subcategory: food.subcategory as any,
      activity: food.activity,
      kgCO2e: food.kgCO2e,
      source: 'manual',
      metadata: { dietType: food.subcategory as any, mealsPerDay: 3, wasteLevel: 'low', locallySourced: foodIndex > 0, organic: foodIndex === 2 }
    });

    // Log transport
    if (i % 7 !== 0 && i % 7 !== 6) {
      const trans = transportMeta[i % transportMeta.length];
      logs.push({
        id: `demo-log-trans-${i}`,
        date: logDate,
        category: 'transport',
        subcategory: trans.subcategory,
        activity: trans.activity,
        kgCO2e: trans.kgCO2e,
        source: 'manual',
        metadata: { mode: trans.subcategory as any, distanceKm: 25, tripsPerWeek: 5 }
      });
    }

    // Log shopping
    if (i % 7 === 2) {
      const shop = shoppingMeta[i % shoppingMeta.length];
      logs.push({
        id: `demo-log-shop-${i}`,
        date: logDate,
        category: 'shopping',
        subcategory: shop.subcategory,
        activity: shop.activity,
        kgCO2e: shop.kgCO2e,
        source: 'manual',
        metadata: { clothingItems: 1, electronicsItems: 0, totalSpend: 50, currency: 'GBP', deliveryType: 'standard' }
      });
    }
  }

  return logs;
}

function generateMockGoals(): Goal[] {
  const now = new Date();
  const deadline1 = new Date();
  deadline1.setDate(now.getDate() + 25);
  const deadline2 = new Date();
  deadline2.setDate(now.getDate() + 60);

  return [
    {
      id: 'demo-goal-1',
      title: 'Go car-free 2 days/week',
      description: 'Replace 2 days of car commuting with walking, cycling, or public transport.',
      category: 'transport',
      targetReduction: 35,
      currentReduction: 20,
      deadline: deadline1,
      calendarEventId: 'demo-cal-1',
      status: 'active',
      milestones: [],
      createdAt: now,
      templateId: 'car_free_days'
    },
    {
      id: 'demo-goal-2',
      title: 'Meat-free Mondays',
      description: 'Skip meat every Monday. Build to 3 meat-free days per week.',
      category: 'food',
      targetReduction: 18,
      currentReduction: 12,
      deadline: deadline2,
      calendarEventId: null,
      status: 'active',
      milestones: [],
      createdAt: now,
      templateId: 'meat_free_monday'
    }
  ];
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function saveUserProfile(
  uid: string,
  profile: Partial<UserProfile>
): Promise<void> {
  if (uid === 'demo-user') {
    if (!demoProfile) demoProfile = getInitialDemoProfile();
    demoProfile = { ...demoProfile, ...profile } as UserProfile;
    return;
  }
  const ref = doc(db, 'users', uid, 'profile', 'data');
  await setDoc(ref, sanitize({ ...profile, updatedAt: serverTimestamp() }), {
    merge: true,
  });
}

export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  if (uid === 'demo-user') {
    if (!demoProfile) demoProfile = getInitialDemoProfile();
    return demoProfile;
  }
  const ref = doc(db, 'users', uid, 'profile', 'data');
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function subscribeToProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  if (uid === 'demo-user') {
    if (!demoProfile) demoProfile = getInitialDemoProfile();
    callback(demoProfile);
    return () => {};
  }
  const ref = doc(db, 'users', uid, 'profile', 'data');
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function saveUserSettings(
  uid: string,
  settings: Partial<UserSettings>
): Promise<void> {
  if (uid === 'demo-user') {
    if (!demoSettings) demoSettings = getInitialDemoSettings();
    demoSettings = { ...demoSettings, ...settings } as UserSettings;
    return;
  }
  const ref = doc(db, 'users', uid, 'settings', 'data');
  await setDoc(ref, sanitize(settings), { merge: true });
}

export async function getUserSettings(
  uid: string
): Promise<UserSettings | null> {
  if (uid === 'demo-user') {
    if (!demoSettings) demoSettings = getInitialDemoSettings();
    return demoSettings;
  }
  const ref = doc(db, 'users', uid, 'settings', 'data');
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserSettings) : null;
}

// ─── Carbon Logs ─────────────────────────────────────────────────────────────

export async function addCarbonLog(
  uid: string,
  log: Omit<CarbonLog, 'id'>
): Promise<string> {
  if (uid === 'demo-user') {
    if (demoLogs.length === 0) demoLogs = generateMockLogs();
    const newLog = { ...log, id: `demo-log-${Math.random().toString(36).slice(2)}` } as CarbonLog;
    demoLogs = [newLog, ...demoLogs];
    notifyLogListeners();
    return newLog.id!;
  }
  const ref = collection(db, 'users', uid, 'logs');
  const docRef = await addDoc(ref, {
    ...sanitize(log as object),
    date: log.date instanceof Date ? Timestamp.fromDate(log.date) : log.date,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCarbonLog(
  uid: string,
  logId: string,
  updates: Partial<CarbonLog>
): Promise<void> {
  if (uid === 'demo-user') {
    demoLogs = demoLogs.map((l) => (l.id === logId ? ({ ...l, ...updates } as CarbonLog) : l));
    notifyLogListeners();
    return;
  }
  const ref = doc(db, 'users', uid, 'logs', logId);
  await updateDoc(ref, {
    ...sanitize(updates as object),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCarbonLog(
  uid: string,
  logId: string
): Promise<void> {
  if (uid === 'demo-user') {
    demoLogs = demoLogs.filter((l) => l.id !== logId);
    notifyLogListeners();
    return;
  }
  const ref = doc(db, 'users', uid, 'logs', logId);
  await deleteDoc(ref);
}

export async function getRecentLogs(
  uid: string,
  days = 30,
  pageSize = 20,
  lastDoc?: QueryDocumentSnapshot
): Promise<PaginatedResult<CarbonLog>> {
  if (uid === 'demo-user') {
    if (demoLogs.length === 0) demoLogs = generateMockLogs();
    return { data: demoLogs.slice(0, pageSize), hasMore: false, lastDoc: null };
  }
  const since = new Date();
  since.setDate(since.getDate() - days);

  let q = query(
    collection(db, 'users', uid, 'logs'),
    where('date', '>=', Timestamp.fromDate(since)),
    orderBy('date', 'desc'),
    limit(pageSize + 1)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snap = await getDocs(q);
  const docs = snap.docs.slice(0, pageSize);
  const hasMore = snap.docs.length > pageSize;

  const data = docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<CarbonLog, 'id'>),
  })) as CarbonLog[];

  return { data, hasMore, lastDoc: docs[docs.length - 1] };
}

export function subscribeToRecentLogs(
  uid: string,
  days: number,
  callback: (logs: CarbonLog[]) => void
): Unsubscribe {
  if (uid === 'demo-user') {
    if (demoLogs.length === 0) demoLogs = generateMockLogs();
    callback(demoLogs);
    logListeners.add(callback);
    return () => {
      logListeners.delete(callback);
    };
  }
  const since = new Date();
  since.setDate(since.getDate() - days);

  const q = query(
    collection(db, 'users', uid, 'logs'),
    where('date', '>=', Timestamp.fromDate(since)),
    orderBy('date', 'desc'),
    limit(100)
  );

  return onSnapshot(q, (snap) => {
    const logs = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CarbonLog, 'id'>),
    })) as CarbonLog[];
    callback(logs);
  });
}

export async function getAllLogsForExport(uid: string): Promise<CarbonLog[]> {
  if (uid === 'demo-user') {
    if (demoLogs.length === 0) demoLogs = generateMockLogs();
    return demoLogs;
  }
  const q = query(
    collection(db, 'users', uid, 'logs'),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<CarbonLog, 'id'>),
  })) as CarbonLog[];
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function addGoal(
  uid: string,
  goal: Omit<Goal, 'id'>
): Promise<string> {
  if (uid === 'demo-user') {
    if (demoGoals.length === 0) demoGoals = generateMockGoals();
    const newGoal = { ...goal, id: `demo-goal-${Math.random().toString(36).slice(2)}` } as Goal;
    demoGoals = [newGoal, ...demoGoals];
    notifyGoalListeners();
    return newGoal.id!;
  }
  const ref = collection(db, 'users', uid, 'goals');
  const docRef = await addDoc(ref, {
    ...sanitize(goal as object),
    deadline:
      goal.deadline instanceof Date
        ? Timestamp.fromDate(goal.deadline)
        : goal.deadline,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateGoal(
  uid: string,
  goalId: string,
  updates: Partial<Goal>
): Promise<void> {
  if (uid === 'demo-user') {
    demoGoals = demoGoals.map((g) => (g.id === goalId ? ({ ...g, ...updates } as Goal) : g));
    notifyGoalListeners();
    return;
  }
  const ref = doc(db, 'users', uid, 'goals', goalId);
  await updateDoc(ref, sanitize(updates as object));
}

export async function deleteGoal(uid: string, goalId: string): Promise<void> {
  if (uid === 'demo-user') {
    demoGoals = demoGoals.filter((g) => g.id !== goalId);
    notifyGoalListeners();
    return;
  }
  const ref = doc(db, 'users', uid, 'goals', goalId);
  await deleteDoc(ref);
}

export function subscribeToGoals(
  uid: string,
  callback: (goals: Goal[]) => void
): Unsubscribe {
  if (uid === 'demo-user') {
    if (demoGoals.length === 0) demoGoals = generateMockGoals();
    callback(demoGoals);
    goalListeners.add(callback);
    return () => {
      goalListeners.delete(callback);
    };
  }
  const q = query(
    collection(db, 'users', uid, 'goals'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const goals = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Goal, 'id'>),
    })) as Goal[];
    callback(goals);
  });
}

// ─── AI Rate Limiting ─────────────────────────────────────────────────────────

export async function checkAndIncrementAIQuery(uid: string): Promise<boolean> {
  if (uid === 'demo-user') {
    return true;
  }
  const today = new Date().toISOString().split('T')[0];
  const ref = doc(db, 'users', uid, 'settings', 'data');
  const snap = await getDoc(ref);
  const data = snap.data() as Partial<UserSettings> | undefined;

  const count = data?.dailyAIQueryCount ?? 0;
  const lastDate = data?.lastAIQueryDate ?? '';

  // Reset if new day
  const effectiveCount = lastDate === today ? count : 0;
  if (effectiveCount >= 20) return false;

  await setDoc(
    ref,
    { dailyAIQueryCount: effectiveCount + 1, lastAIQueryDate: today },
    { merge: true }
  );
  return true;
}

// ─── GDPR: Account Deletion ───────────────────────────────────────────────────

export async function deleteAllUserData(uid: string): Promise<void> {
  if (uid === 'demo-user') {
    demoProfile = null;
    demoSettings = null;
    demoLogs = [];
    demoGoals = [];
    notifyLogListeners();
    notifyGoalListeners();
    return;
  }
  const batch = writeBatch(db);

  // Delete logs
  const logsSnap = await getDocs(collection(db, 'users', uid, 'logs'));
  logsSnap.docs.forEach((d) => batch.delete(d.ref));

  // Delete goals
  const goalsSnap = await getDocs(collection(db, 'users', uid, 'goals'));
  goalsSnap.docs.forEach((d) => batch.delete(d.ref));

  // Delete profile
  batch.delete(doc(db, 'users', uid, 'profile', 'data'));

  // Delete settings
  batch.delete(doc(db, 'users', uid, 'settings', 'data'));

  await batch.commit();
}
