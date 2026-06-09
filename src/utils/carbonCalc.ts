import {
  TRANSPORT_KG_PER_KM,
  GRID_FACTORS,
  HEATING_FACTORS,
  FOOD_FACTORS,
  FOOD_WASTE_MULTIPLIERS,
  LOCAL_SOURCING_FACTOR,
  ORGANIC_FACTOR,
  FLIGHT_FACTORS,
  FLIGHT_RFI_MULTIPLIER,
  SHORT_HAUL_THRESHOLD_KM,
  CLOTHING_KG_PER_ITEM,
  ELECTRONICS_KG_PER_ITEM,
  GENERAL_SPEND_KG_PER_GBP,
  DELIVERY_FACTORS,
  SCORE_THRESHOLDS,
  TARGET_1_5C_KG_YEAR,
  NATIONAL_AVERAGES,
} from '../constants/emissionFactors';
import type {
  TransportMode,
  FuelType,
  GridRegion,
  DietType,
  FoodWasteLevel,
  DeliveryType,
  CabinClass,
  HeatingType,
  DailyEmissionsBreakdown,
  CarbonScore,
  CategoryType,
} from '../types';

// ─── Transport ────────────────────────────────────────────────────────────────

/**
 * Calculate kg CO₂e for a transport activity.
 * @param mode - Transport mode
 * @param distanceKm - One-way distance in km
 * @param fuelType - Only for cars; defaults to 'petrol'
 * @param tripsPerWeek - Multiplier for weekly trips (defaults to 1)
 * @param engineSize - Car engine size category
 */
export function calculateTransportEmissions(
  mode: TransportMode,
  distanceKm: number,
  fuelType?: FuelType,
  tripsPerWeek = 1,
  engineSize: 'small' | 'medium' | 'large' = 'medium'
): number {
  if (distanceKm < 0) throw new Error('Distance cannot be negative');
  if (tripsPerWeek < 0) throw new Error('Trips per week cannot be negative');
  if (distanceKm === 0) return 0;

  let factorKey: string;

  if (mode === 'petrol_car' || (mode === 'ev_car' && fuelType === 'petrol')) {
    factorKey = `petrol_car_${engineSize}`;
  } else if (mode === 'diesel_car') {
    factorKey = `diesel_car_${engineSize}`;
  } else if (mode === 'ev_car') {
    factorKey = 'ev_car';
  } else if (mode === 'hybrid_car') {
    factorKey = 'hybrid_car';
  } else {
    factorKey = mode;
  }

  // Handle fuel type overrides
  if (fuelType) {
    if (fuelType === 'ev') factorKey = 'ev_car';
    else if (fuelType === 'hybrid') factorKey = 'hybrid_car';
    else if (fuelType === 'diesel') factorKey = `diesel_car_${engineSize}`;
    else if (fuelType === 'petrol') factorKey = `petrol_car_${engineSize}`;
  }

  const factor = TRANSPORT_KG_PER_KM[factorKey] ?? 0.170;
  return factor * distanceKm * tripsPerWeek;
}

// ─── Energy ───────────────────────────────────────────────────────────────────

/**
 * Calculate kg CO₂e for household energy use.
 * @param kwh - Monthly electricity consumption in kWh
 * @param gridRegion - Geographic grid for emission intensity
 * @param occupants - Number of occupants (divides total)
 * @param greenTariff - User is on 100% renewable tariff
 * @param heatingKwh - Optional monthly heating kWh
 * @param heatingType - Heating fuel type
 */
export function calculateEnergyEmissions(
  kwh: number,
  gridRegion: GridRegion,
  occupants = 1,
  greenTariff = false,
  heatingKwh = 0,
  heatingType: HeatingType = 'gas'
): number {
  if (kwh < 0) throw new Error('kWh cannot be negative');
  if (occupants < 1) throw new Error('Occupants must be at least 1');

  const gridFactor = greenTariff ? 0.010 : GRID_FACTORS[gridRegion];
  const electricityEmissions = kwh * gridFactor;
  const heatingEmissions = heatingKwh * HEATING_FACTORS[heatingType];

  return (electricityEmissions + heatingEmissions) / occupants;
}

// ─── Food ─────────────────────────────────────────────────────────────────────

/**
 * Calculate kg CO₂e for daily food consumption.
 * @param dietType - Diet category
 * @param wasteLevel - Level of food waste
 * @param locallySourced - Predominantly locally sourced food
 * @param organic - Predominantly organic produce
 * @param mealsPerDay - Number of meals (affects scaling; default 3)
 */
export function calculateFoodEmissions(
  dietType: DietType,
  wasteLevel: FoodWasteLevel = 'low',
  locallySourced = false,
  organic = false,
  mealsPerDay = 3
): number {
  let base = FOOD_FACTORS[dietType];

  // Scale by meals (base is 3 meals/day)
  base = (base * mealsPerDay) / 3;

  // Apply waste multiplier
  base *= FOOD_WASTE_MULTIPLIERS[wasteLevel];

  // Apply sourcing reductions
  if (locallySourced) base *= LOCAL_SOURCING_FACTOR;
  if (organic) base *= ORGANIC_FACTOR;

  return base;
}

// ─── Shopping ─────────────────────────────────────────────────────────────────

/**
 * Calculate monthly kg CO₂e for shopping habits.
 * @param clothingItems - New clothing items per month
 * @param electronicsItems - New electronics per year (converted to monthly)
 * @param totalSpend - Total monthly goods spend in GBP equivalent
 * @param deliveryType - Primary delivery preference
 */
export function calculateShoppingEmissions(
  clothingItems: number,
  electronicsItems: number,
  totalSpend: number,
  deliveryType: DeliveryType = 'standard'
): number {
  if (clothingItems < 0 || electronicsItems < 0 || totalSpend < 0) {
    throw new Error('Shopping inputs cannot be negative');
  }

  const clothingEmissions = clothingItems * CLOTHING_KG_PER_ITEM;
  const electronicsMonthly = (electronicsItems / 12) * ELECTRONICS_KG_PER_ITEM;
  const spendEmissions = totalSpend * GENERAL_SPEND_KG_PER_GBP;

  const subtotal = clothingEmissions + electronicsMonthly + spendEmissions;
  return subtotal * DELIVERY_FACTORS[deliveryType];
}

// ─── Flights ──────────────────────────────────────────────────────────────────

/**
 * Calculate kg CO₂e for a flight, including Radiative Forcing Index.
 * @param distanceKm - Great-circle distance in km (one-way)
 * @param cabinClass - Seat class (economy/business/first)
 * @param isReturn - Whether the ticket is return (doubles distance)
 */
export function calculateFlightEmissions(
  distanceKm: number,
  cabinClass: CabinClass,
  isReturn: boolean
): number {
  if (distanceKm <= 0) throw new Error('Flight distance must be positive');

  const type =
    distanceKm <= SHORT_HAUL_THRESHOLD_KM ? 'short_haul' : 'long_haul';
  const baseFactor = FLIGHT_FACTORS[type][cabinClass];
  const totalDistance = isReturn ? distanceKm * 2 : distanceKm;

  // RFI multiplier accounts for non-CO₂ warming effects at altitude
  return totalDistance * baseFactor * FLIGHT_RFI_MULTIPLIER;
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

/**
 * Sum all category emissions into a daily breakdown.
 */
export function getTotalDailyEmissions(emissions: {
  transport?: number;
  energy?: number;
  food?: number;
  shopping?: number;
  travel?: number;
}): DailyEmissionsBreakdown {
  const transport = emissions.transport ?? 0;
  const energy = emissions.energy ?? 0;
  const food = emissions.food ?? 0;
  const shopping = emissions.shopping ?? 0;
  const travel = emissions.travel ?? 0;
  const total = transport + energy + food + shopping + travel;

  return { transport, energy, food, shopping, travel, total };
}

/**
 * Project annual emissions from a daily average.
 */
export function getAnnualProjection(dailyAvgKg: number): number {
  return dailyAvgKg * 365;
}

/**
 * Compare user's annual emissions to the 1.5°C target.
 * @returns positive = exceeds target (bad), negative = below target (good)
 */
export function compareToTarget(
  annualKg: number,
  target = TARGET_1_5C_KG_YEAR
): { differenceKg: number; percentageOver: number; isUnderTarget: boolean } {
  const differenceKg = annualKg - target;
  const percentageOver = ((annualKg - target) / target) * 100;
  return {
    differenceKg,
    percentageOver,
    isUnderTarget: annualKg <= target,
  };
}

/**
 * Get national average for a country.
 */
export function getNationalAverage(country: string): number {
  const found = NATIONAL_AVERAGES.find((n) => n.country === country);
  return found?.kgPerYear ?? 7000;
}

/**
 * Compute a comprehensive carbon score from recent log data.
 */
export function computeCarbonScore(
  logs: Array<{ kgCO2e: number; date: Date | { toDate: () => Date } }>,
  country: string
): CarbonScore {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const getDate = (d: Date | { toDate: () => Date }) =>
    d instanceof Date ? d : d.toDate();

  const weekLogs = logs.filter((l) => getDate(l.date) >= weekAgo);
  const monthLogs = logs.filter((l) => getDate(l.date) >= monthAgo);
  const prevWeekLogs = logs.filter(
    (l) => getDate(l.date) >= prevWeekStart && getDate(l.date) < weekAgo
  );

  const weekly = weekLogs.reduce((s, l) => s + l.kgCO2e, 0);
  const monthly = monthLogs.reduce((s, l) => s + l.kgCO2e, 0);
  const daily = weekly / 7;
  const annual = getAnnualProjection(daily);

  const prevWeekly = prevWeekLogs.reduce((s, l) => s + l.kgCO2e, 0);
  const nationalAvg = getNationalAverage(country);

  let trend: CarbonScore['trend'] = 'stable';
  if (weekly < prevWeekly * 0.95) trend = 'improving';
  else if (weekly > prevWeekly * 1.05) trend = 'worsening';

  let rating: CarbonScore['rating'] = 'very_high';
  if (daily < SCORE_THRESHOLDS.excellent) rating = 'excellent';
  else if (daily < SCORE_THRESHOLDS.good) rating = 'good';
  else if (daily < SCORE_THRESHOLDS.average) rating = 'average';
  else if (daily < SCORE_THRESHOLDS.high) rating = 'high';

  return {
    daily,
    weekly,
    monthly,
    annual,
    annualProjection: annual,
    vsNationalAverage: ((annual - nationalAvg) / nationalAvg) * 100,
    vs1_5CTarget: ((annual - TARGET_1_5C_KG_YEAR) / TARGET_1_5C_KG_YEAR) * 100,
    rating,
    trend,
  };
}

/**
 * Get score color based on rating.
 */
export function getScoreColor(rating: CarbonScore['rating']): string {
  const colors: Record<CarbonScore['rating'], string> = {
    excellent: '#40916C',
    good: '#74C69D',
    average: '#F4A261',
    high: '#E76F51',
    very_high: '#C1121F',
  };
  return colors[rating];
}

/**
 * Get category label and icon.
 */
export function getCategoryMeta(
  category: CategoryType
): { label: string; icon: string; color: string } {
  const meta: Record<CategoryType, { label: string; icon: string; color: string }> = {
    transport: { label: 'Transport', icon: '🚗', color: '#4895EF' },
    energy: { label: 'Home Energy', icon: '🏠', color: '#F4A261' },
    food: { label: 'Food', icon: '🍔', color: '#74C69D' },
    shopping: { label: 'Shopping', icon: '🛍️', color: '#9D4EDD' },
    travel: { label: 'Travel', icon: '✈️', color: '#774936' },
  };
  return meta[category];
}

/**
 * Calculate equivalent trees planted (1 tree absorbs ~21.7 kg CO₂/year).
 */
export function kgToTrees(kgCO2eReduced: number): number {
  return Math.round(kgCO2eReduced / 21.7);
}

/**
 * Format kg CO₂e with appropriate units (kg or tonnes).
 */
export function formatCO2(kg: number, decimals = 1): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(decimals)}t CO₂e`;
  }
  return `${kg.toFixed(decimals)} kg CO₂e`;
}

/**
 * Get carbon streak (consecutive days below a threshold).
 */
export function getCarbonStreak(
  logs: Array<{ kgCO2e: number; date: Date | { toDate: () => Date } }>,
  dailyThresholdKg = 6.3
): number {
  const getDate = (d: Date | { toDate: () => Date }) =>
    d instanceof Date ? d : d.toDate();

  // Group logs by day
  const byDay = new Map<string, number>();
  for (const log of logs) {
    const dateStr = getDate(log.date).toISOString().split('T')[0];
    byDay.set(dateStr, (byDay.get(dateStr) ?? 0) + log.kgCO2e);
  }

  // Count consecutive days from today
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dayTotal = byDay.get(key) ?? 0;
    if (dayTotal <= dailyThresholdKg) streak++;
    else break;
  }

  return streak;
}
