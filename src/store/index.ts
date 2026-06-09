import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from 'firebase/auth';
import type {
  UserProfile,
  UserSettings,
  CarbonLog,
  Goal,
  ChatMessage,
  CategoryType,
} from '../types';

// ─── Auth Slice ───────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  accessToken: string | null; // Google OAuth token for Calendar/Sheets
  isAuthLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setAuthLoading: (loading: boolean) => void;
}

// ─── Profile Slice ────────────────────────────────────────────────────────────

interface ProfileState {
  profile: UserProfile | null;
  settings: UserSettings | null;
  isProfileLoading: boolean;
  setProfile: (profile: UserProfile | null) => void;
  setSettings: (settings: UserSettings | null) => void;
  setProfileLoading: (loading: boolean) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

// ─── Logs Slice ───────────────────────────────────────────────────────────────

interface LogsState {
  logs: CarbonLog[];
  isLogsLoading: boolean;
  hasMoreLogs: boolean;
  pendingLogs: Omit<CarbonLog, 'id'>[]; // Offline queue
  setLogs: (logs: CarbonLog[]) => void;
  addLogOptimistic: (log: CarbonLog) => void;
  removeLogOptimistic: (logId: string) => void;
  setLogsLoading: (loading: boolean) => void;
  setHasMoreLogs: (has: boolean) => void;
  addPendingLog: (log: Omit<CarbonLog, 'id'>) => void;
  clearPendingLogs: () => void;
}

// ─── Goals Slice ──────────────────────────────────────────────────────────────

interface GoalsState {
  goals: Goal[];
  isGoalsLoading: boolean;
  setGoals: (goals: Goal[]) => void;
  addGoalOptimistic: (goal: Goal) => void;
  removeGoalOptimistic: (goalId: string) => void;
  setGoalsLoading: (loading: boolean) => void;
}

// ─── UI Slice ─────────────────────────────────────────────────────────────────

interface UIState {
  activeTab: string;
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  isOnboarding: boolean;
  onboardingStep: number;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  }>;
  setActiveTab: (tab: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setIsOnboarding: (onboarding: boolean) => void;
  setOnboardingStep: (step: number) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
}

// ─── AI Slice ─────────────────────────────────────────────────────────────────

interface AIState {
  chatMessages: ChatMessage[];
  isAIStreaming: boolean;
  aiQueryCount: number;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  setAIStreaming: (streaming: boolean) => void;
  clearChat: () => void;
  incrementQueryCount: () => void;
}

// ─── Combined Store ───────────────────────────────────────────────────────────

type AppStore = AuthState &
  ProfileState &
  LogsState &
  GoalsState &
  UIState &
  AIState;

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ─── Auth ───────────────────────────────────────────────────────────────
      user: null,
      accessToken: null,
      isAuthLoading: true,
      setUser: (user) => set({ user }),
      setAccessToken: (token) => set({ accessToken: token }),
      setAuthLoading: (loading) => set({ isAuthLoading: loading }),

      // ─── Profile ────────────────────────────────────────────────────────────
      profile: null,
      settings: null,
      isProfileLoading: false,
      setProfile: (profile) => set({ profile }),
      setSettings: (settings) => set({ settings }),
      setProfileLoading: (loading) => set({ isProfileLoading: loading }),
      updateProfile: (updates) =>
        set((state) =>
          state.profile
            ? { profile: { ...state.profile, ...updates } }
            : state
        ),

      // ─── Logs ───────────────────────────────────────────────────────────────
      logs: [],
      isLogsLoading: false,
      hasMoreLogs: false,
      pendingLogs: [],
      setLogs: (logs) => set({ logs }),
      addLogOptimistic: (log) =>
        set((state) => ({ logs: [log, ...state.logs] })),
      removeLogOptimistic: (logId) =>
        set((state) => ({ logs: state.logs.filter((l) => l.id !== logId) })),
      setLogsLoading: (loading) => set({ isLogsLoading: loading }),
      setHasMoreLogs: (has) => set({ hasMoreLogs: has }),
      addPendingLog: (log) =>
        set((state) => ({ pendingLogs: [...state.pendingLogs, log] })),
      clearPendingLogs: () => set({ pendingLogs: [] }),

      // ─── Goals ──────────────────────────────────────────────────────────────
      goals: [],
      isGoalsLoading: false,
      setGoals: (goals) => set({ goals }),
      addGoalOptimistic: (goal) =>
        set((state) => ({ goals: [goal, ...state.goals] })),
      removeGoalOptimistic: (goalId) =>
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== goalId),
        })),
      setGoalsLoading: (loading) => set({ isGoalsLoading: loading }),

      // ─── UI ─────────────────────────────────────────────────────────────────
      activeTab: 'dashboard',
      sidebarOpen: true,
      theme: 'system',
      isOnboarding: false,
      onboardingStep: 1,
      notifications: [],
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setIsOnboarding: (onboarding) => set({ isOnboarding: onboarding }),
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...notification, id: Math.random().toString(36).slice(2) },
          ],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      // ─── AI ─────────────────────────────────────────────────────────────────
      chatMessages: [],
      isAIStreaming: false,
      aiQueryCount: 0,
      addChatMessage: (msg) =>
        set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      updateLastMessage: (content) =>
        set((state) => {
          const messages = [...state.chatMessages];
          const last = messages[messages.length - 1];
          if (last && last.role === 'assistant') {
            messages[messages.length - 1] = { ...last, content };
          }
          return { chatMessages: messages };
        }),
      setAIStreaming: (streaming) => set({ isAIStreaming: streaming }),
      clearChat: () => set({ chatMessages: [] }),
      incrementQueryCount: () =>
        set((state) => ({ aiQueryCount: state.aiQueryCount + 1 })),
    }),
    {
      name: 'ecotrack-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist UI preferences and offline queue — not auth state
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        pendingLogs: state.pendingLogs,
      }),
    }
  )
);

// ─── Derived Selectors ────────────────────────────────────────────────────────

export const useUser = () => useAppStore((s) => s.user);
export const useProfile = () => useAppStore((s) => s.profile);
export const useSettings = () => useAppStore((s) => s.settings);
export const useLogs = () => useAppStore((s) => s.logs);
export const useGoals = () => useAppStore((s) => s.goals);
export const useTheme = () => useAppStore((s) => s.theme);
export const useNotifications = () => useAppStore((s) => s.notifications);
export const useChatMessages = () => useAppStore((s) => s.chatMessages);
