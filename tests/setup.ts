import '@testing-library/jest-dom';

// Mock Firebase modules for unit tests
vi.mock('../src/services/firebase', () => ({
  db: {},
  auth: { currentUser: null },
  googleProvider: {},
  analytics: Promise.resolve(null),
}));

vi.mock('../src/services/firestore', () => ({
  getUserProfile: vi.fn(),
  saveUserProfile: vi.fn(),
  addCarbonLog: vi.fn(),
  subscribeToRecentLogs: vi.fn(() => () => {}),
  subscribeToGoals: vi.fn(() => () => {}),
}));

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// Mock date-fns to ensure consistent dates in tests
vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
