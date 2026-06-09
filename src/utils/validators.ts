import { z } from 'zod';

// ─── Common validators ────────────────────────────────────────────────────────

const positiveNumber = z.number().min(0, 'Must be zero or greater');
const positiveDistance = z.number().min(0.01, 'Distance must be greater than 0');
const pastOrPresentDate = z.date().max(new Date(), 'Date cannot be in the future');

// ─── Transport ────────────────────────────────────────────────────────────────

export const TransportLogSchema = z.object({
  mode: z.enum(['petrol_car', 'diesel_car', 'ev_car', 'hybrid_car', 'bus', 'train', 'flight', 'bike', 'walk']),
  fuelType: z.enum(['petrol', 'diesel', 'ev', 'hybrid']).optional(),
  engineSize: z.enum(['small', 'medium', 'large']).optional().default('medium'),
  distanceKm: positiveDistance,
  tripsPerWeek: z.number().min(1).max(100).default(1),
  date: pastOrPresentDate.optional().default(() => new Date()),
});

export type TransportLogFormData = z.infer<typeof TransportLogSchema>;

// ─── Energy ───────────────────────────────────────────────────────────────────

export const EnergyLogSchema = z.object({
  kwh: positiveNumber,
  heatingType: z.enum(['gas', 'oil', 'heat_pump', 'electric', 'wood']).default('gas'),
  heatingKwh: positiveNumber.optional().default(0),
  houseSizeSqm: z.number().min(10).max(2000).optional().default(85),
  occupants: z.number().min(1).max(20).default(2),
  greenTariff: z.boolean().default(false),
  gridRegion: z.enum(['uk', 'eu', 'us', 'india', 'china', 'australia', 'renewables', 'coal_heavy']).default('uk'),
  date: pastOrPresentDate.optional().default(() => new Date()),
});

export type EnergyLogFormData = z.infer<typeof EnergyLogSchema>;

// ─── Food ─────────────────────────────────────────────────────────────────────

export const FoodLogSchema = z.object({
  dietType: z.enum(['vegan', 'vegetarian', 'flexitarian', 'low_meat', 'medium_meat', 'high_meat']),
  mealsPerDay: z.number().min(1).max(10).default(3),
  wasteLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  locallySourced: z.boolean().default(false),
  organic: z.boolean().default(false),
  date: pastOrPresentDate.optional().default(() => new Date()),
});

export type FoodLogFormData = z.infer<typeof FoodLogSchema>;

// ─── Shopping ─────────────────────────────────────────────────────────────────

export const ShoppingLogSchema = z.object({
  clothingItems: z.number().min(0).max(200).default(0),
  electronicsItems: z.number().min(0).max(50).default(0),
  totalSpend: positiveNumber,
  currency: z.enum(['GBP', 'USD', 'EUR', 'INR']).default('GBP'),
  deliveryType: z.enum(['standard', 'express', 'click_collect']).default('standard'),
  date: pastOrPresentDate.optional().default(() => new Date()),
});

export type ShoppingLogFormData = z.infer<typeof ShoppingLogSchema>;

// ─── Travel / Flights ─────────────────────────────────────────────────────────

export const FlightRouteSchema = z.object({
  origin: z.string().min(2, 'Enter origin city or airport').max(100),
  destination: z.string().min(2, 'Enter destination city or airport').max(100),
  distanceKm: positiveDistance,
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
  isReturn: z.boolean().default(false),
  type: z.enum(['short_haul', 'long_haul']).default('long_haul'),
});

export const TravelLogSchema = z.object({
  flights: z.array(FlightRouteSchema).min(1, 'Add at least one flight'),
  holidayType: z.enum(['staycation', 'domestic', 'international']).default('international'),
  date: pastOrPresentDate.optional().default(() => new Date()),
});

export type TravelLogFormData = z.infer<typeof TravelLogSchema>;

// ─── Log Entry (generic) ──────────────────────────────────────────────────────

export const LogEntrySchema = z.object({
  kgCO2e: positiveNumber,
  category: z.enum(['transport', 'energy', 'food', 'shopping', 'travel']),
  subcategory: z.string().min(1).max(100),
  activity: z.string().min(1).max(500),
  date: pastOrPresentDate.optional().default(() => new Date()),
  source: z.enum(['manual', 'maps', 'import']).default('manual'),
});

export type LogEntryFormData = z.infer<typeof LogEntrySchema>;

// ─── Goal ─────────────────────────────────────────────────────────────────────

export const GoalSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(500).optional().default(''),
  category: z.enum(['transport', 'energy', 'food', 'shopping', 'travel']),
  targetReduction: z.number().min(0.1, 'Target must be greater than 0').max(10000),
  deadline: z.date().min(new Date(), 'Deadline must be in the future'),
});

export type GoalFormData = z.infer<typeof GoalSchema>;

// ─── User Profile ─────────────────────────────────────────────────────────────

export const ProfileSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  country: z.string().min(1, 'Select a country'),
  city: z.string().min(1, 'Enter your city').max(100),
  dietType: z.enum(['vegan', 'vegetarian', 'flexitarian', 'low_meat', 'medium_meat', 'high_meat']),
  primaryTransport: z.enum(['petrol_car', 'diesel_car', 'ev_car', 'hybrid_car', 'bus', 'train', 'flight', 'bike', 'walk']),
  householdSize: z.number().min(1).max(20),
  homeSize: z.number().min(10).max(2000).optional(),
  hasGreenTariff: z.boolean().default(false),
});

export type ProfileFormData = z.infer<typeof ProfileSchema>;

// ─── Onboarding Steps ─────────────────────────────────────────────────────────

export const OnboardingStep1Schema = z.object({
  country: z.string().min(1, 'Select your country'),
  city: z.string().min(1, 'Enter your city').max(100),
  gridRegion: z.enum(['uk', 'eu', 'us', 'india', 'china', 'australia', 'renewables', 'coal_heavy']).optional(),
});

export const OnboardingStep2Schema = z.object({
  dietType: z.enum(['vegan', 'vegetarian', 'flexitarian', 'low_meat', 'medium_meat', 'high_meat']),
  primaryTransport: z.enum(['petrol_car', 'diesel_car', 'ev_car', 'hybrid_car', 'bus', 'train', 'flight', 'bike', 'walk']),
  householdSize: z.number().min(1).max(20),
  homeSize: z.number().min(10).max(2000).optional(),
  hasGreenTariff: z.boolean().default(false),
});

export const OnboardingStep3Schema = z.object({
  weeklyCarKm: positiveNumber,
  monthlyFlights: positiveNumber,
  monthlyEnergyKwh: positiveNumber,
});

export const OnboardingStep4Schema = z.object({
  reductionPercent: z.number().min(5).max(100),
  timeframeMonths: z.number().min(1).max(60),
  selectedTemplates: z.array(z.string()),
});
