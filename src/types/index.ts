import { Timestamp } from 'firebase/firestore';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type DietType =
  | 'vegan'
  | 'vegetarian'
  | 'flexitarian'
  | 'low_meat'
  | 'medium_meat'
  | 'high_meat';

export type TransportMode =
  | 'petrol_car'
  | 'diesel_car'
  | 'ev_car'
  | 'hybrid_car'
  | 'bus'
  | 'train'
  | 'flight'
  | 'bike'
  | 'walk';

export type FuelType = 'petrol' | 'diesel' | 'ev' | 'hybrid';

export type CategoryType =
  | 'transport'
  | 'energy'
  | 'food'
  | 'shopping'
  | 'travel';

export type HeatingType = 'gas' | 'oil' | 'heat_pump' | 'electric' | 'wood';

export type FoodWasteLevel = 'low' | 'medium' | 'high';

export type DeliveryType = 'standard' | 'express' | 'click_collect';

export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

export type FlightType = 'short_haul' | 'long_haul';

export type HolidayType = 'staycation' | 'domestic' | 'international';

export type GoalStatus = 'active' | 'completed' | 'abandoned';

export type ThemeType = 'light' | 'dark' | 'system';

export type UnitSystem = 'metric' | 'imperial';

export type LogSource = 'manual' | 'maps' | 'import';

export type GridRegion =
  | 'uk'
  | 'eu'
  | 'us'
  | 'india'
  | 'china'
  | 'australia'
  | 'renewables'
  | 'coal_heavy';

// ─── User & Profile ───────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  country: string;
  city: string;
  dietType: DietType;
  primaryTransport: TransportMode;
  householdSize: number;
  homeSize: number; // sq meters
  hasGreenTariff: boolean;
  gridRegion: GridRegion;
  createdAt: Timestamp | Date;
  onboardingComplete: boolean;
  onboardingStep: number;
}

export interface NotificationPrefs {
  weeklyDigest: boolean;
  dailyTip: boolean;
  goalReminders: boolean;
  email: string;
}

export interface ConnectedServices {
  googleCalendar: boolean;
  googleSheets: boolean;
  calendarConnectedAt?: Date;
  sheetsConnectedAt?: Date;
}

export interface UserSettings {
  units: UnitSystem;
  theme: ThemeType;
  notifications: NotificationPrefs;
  connectedServices: ConnectedServices;
  dailyAIQueryCount: number;
  lastAIQueryDate: string; // YYYY-MM-DD
}

// ─── Carbon Log Entries ───────────────────────────────────────────────────────

export interface BaseLog {
  id?: string;
  date: Timestamp | Date;
  category: CategoryType;
  subcategory: string;
  activity: string;
  kgCO2e: number;
  source: LogSource;
  metadata: Record<string, unknown>;
}

export interface TransportLog extends BaseLog {
  category: 'transport';
  metadata: {
    mode: TransportMode;
    fuelType?: FuelType;
    distanceKm: number;
    tripsPerWeek: number;
    engineSize?: 'small' | 'medium' | 'large';
  };
}

export interface EnergyLog extends BaseLog {
  category: 'energy';
  metadata: {
    kwh: number;
    heatingType: HeatingType;
    houseSizeSqm?: number;
    heatingKwh?: number;
    occupants: number;
    greenTariff: boolean;
    gridRegion: GridRegion;
  };
}

export interface FoodLog extends BaseLog {
  category: 'food';
  metadata: {
    dietType: DietType;
    mealsPerDay: number;
    wasteLevel: FoodWasteLevel;
    locallySourced: boolean;
    organic: boolean;
  };
}

export interface ShoppingLog extends BaseLog {
  category: 'shopping';
  metadata: {
    clothingItems: number;
    electronicsItems: number;
    totalSpend: number;
    currency: string;
    deliveryType: DeliveryType;
  };
}

export interface FlightRoute {
  origin: string;
  destination: string;
  distanceKm: number;
  cabinClass: CabinClass;
  isReturn: boolean;
  type: FlightType;
}

export interface TravelLog extends BaseLog {
  category: 'travel';
  metadata: {
    flights: FlightRoute[];
    holidayType: HolidayType;
  };
}

export type CarbonLog =
  | TransportLog
  | EnergyLog
  | FoodLog
  | ShoppingLog
  | TravelLog;

// ─── Goals ────────────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  title: string;
  targetDate: Timestamp | Date;
  achieved: boolean;
  achievedAt?: Timestamp | Date;
}

export interface Goal {
  id?: string;
  title: string;
  description: string;
  category: CategoryType;
  targetReduction: number; // kg CO₂e per month
  currentReduction: number;
  deadline: Timestamp | Date;
  calendarEventId: string | null;
  status: GoalStatus;
  milestones: Milestone[];
  createdAt: Timestamp | Date;
  templateId?: string;
}

// ─── Carbon Calculation Types ─────────────────────────────────────────────────

export interface TransportEmissionInput {
  mode: TransportMode;
  distanceKm: number;
  fuelType?: FuelType;
  tripsPerWeek?: number;
}

export interface EnergyEmissionInput {
  kwh: number;
  gridRegion: GridRegion;
  occupants: number;
  greenTariff?: boolean;
}

export interface FoodEmissionInput {
  dietType: DietType;
  mealsPerDay?: number;
  wasteLevel?: FoodWasteLevel;
  locallySourced?: boolean;
  organic?: boolean;
}

export interface ShoppingEmissionInput {
  clothingItems: number;
  electronicsItems: number;
  totalSpend: number;
  deliveryType?: DeliveryType;
}

export interface FlightEmissionInput {
  distanceKm: number;
  cabinClass: CabinClass;
  isReturn: boolean;
  type: FlightType;
}

export interface DailyEmissionsBreakdown {
  transport: number;
  energy: number;
  food: number;
  shopping: number;
  travel: number;
  total: number;
}

export interface CarbonScore {
  daily: number;
  weekly: number;
  monthly: number;
  annual: number;
  annualProjection: number;
  vsNationalAverage: number; // percentage diff
  vs1_5CTarget: number; // percentage diff from 2300kg/year
  rating: 'excellent' | 'good' | 'average' | 'high' | 'very_high';
  trend: 'improving' | 'stable' | 'worsening';
}

// ─── Dashboard & Charts ───────────────────────────────────────────────────────

export interface WeeklyDataPoint {
  date: string;
  transport: number;
  energy: number;
  food: number;
  shopping: number;
  travel: number;
  total: number;
}

export interface CategorySummary {
  category: CategoryType;
  label: string;
  icon: string;
  color: string;
  kgCO2e: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

export interface ComparisonData {
  user: number;
  nationalAverage: number;
  target1_5C: number;
  countryName: string;
}

// ─── AI & Gemini ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
  isStreaming?: boolean;
}

export interface AIContext {
  userName: string;
  country: string;
  city: string;
  weeklyTotal: number;
  topCategory: CategoryType;
  topCategoryKg: number;
  trend: 'improving' | 'worsening' | 'stable';
  goals: string[];
  dietType: DietType;
  primaryTransport: TransportMode;
  nationalAvg: number;
}

export interface SuggestedAction {
  id: string;
  category: CategoryType;
  title: string;
  description: string;
  annualSavingKg: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  source: 'rule' | 'gemini';
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface ReportPeriod {
  type: 'monthly' | 'quarterly' | 'annual';
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface Report {
  period: ReportPeriod;
  totalKgCO2e: number;
  reductionPercent: number;
  bestCategory: CategoryType;
  worstCategory: CategoryType;
  equivalentTrees: number;
  breakdown: DailyEmissionsBreakdown;
  logs: CarbonLog[];
  weeklyData: WeeklyDataPoint[];
}

// ─── Google Maps ──────────────────────────────────────────────────────────────

export interface RouteResult {
  distanceKm: number;
  distanceMiles: number;
  duration: string;
  origin: string;
  destination: string;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export interface OnboardingData {
  step: number;
  location: {
    country: string;
    city: string;
    gridRegion: GridRegion;
  };
  lifestyle: {
    dietType: DietType;
    primaryTransport: TransportMode;
    householdSize: number;
    homeSize: number;
    hasGreenTariff: boolean;
  };
  baseline: {
    weeklyCarKm: number;
    monthlyFlights: number;
    monthlyEnergyKwh: number;
  };
  goals: {
    reductionPercent: number;
    timeframeMonths: number;
    selectedTemplates: string[];
  };
}

// ─── Firestore helpers ────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  lastDoc: unknown;
}

export interface NationalAverage {
  country: string;
  kgPerYear: number;
  gridIntensity: number;
}
