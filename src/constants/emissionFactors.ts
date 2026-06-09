import type {
  TransportMode,
  FuelType,
  GridRegion,
  DietType,
  FoodWasteLevel,
  DeliveryType,
  CabinClass,
  FlightType,
  HeatingType,
  NationalAverage,
} from '../types';

// ─── Transport Emission Factors (kg CO₂e per km) ─────────────────────────────
// Source: DEFRA 2023, IPCC AR6

export const TRANSPORT_FACTORS: Record<TransportMode, number> & {
  petrol_car: Record<string, number>;
  diesel_car: Record<string, number>;
} = {
  petrol_car: {
    small: 0.148,
    medium: 0.170,
    large: 0.209,
    default: 0.170,
  },
  diesel_car: {
    small: 0.132,
    medium: 0.163,
    large: 0.196,
    default: 0.163,
  },
  ev_car: 0.053,
  hybrid_car: 0.106,
  bus: 0.089,
  train: 0.035,
  flight: 0.195, // base, see flight factors
  bike: 0.0,
  walk: 0.0,
} as any;

export const TRANSPORT_KG_PER_KM: Record<string, number> = {
  petrol_car_small: 0.148,
  petrol_car_medium: 0.170,
  petrol_car_large: 0.209,
  diesel_car_small: 0.132,
  diesel_car_medium: 0.163,
  diesel_car_large: 0.196,
  ev_car: 0.053,
  hybrid_car: 0.106,
  bus: 0.089,
  train: 0.035,
  bike: 0.0,
  walk: 0.0,
};

// ─── Flight Emission Factors (kg CO₂e per km, per passenger) ─────────────────
// Radiative Forcing Index (RFI) multiplier of 1.9x applied for non-CO₂ effects
// Source: DEFRA 2023

export const FLIGHT_RFI_MULTIPLIER = 1.9;

export const FLIGHT_FACTORS: Record<
  FlightType,
  Record<CabinClass, number>
> = {
  short_haul: {
    economy: 0.255,
    premium_economy: 0.255 * 1.6,
    business: 0.255 * 2.0,
    first: 0.255 * 2.4,
  },
  long_haul: {
    economy: 0.195,
    premium_economy: 0.195 * 1.5,
    business: 0.195 * 2.9,
    first: 0.195 * 3.5,
  },
};

// Short-haul threshold (km)
export const SHORT_HAUL_THRESHOLD_KM = 3700;

// ─── Grid Intensity (kg CO₂e per kWh) ────────────────────────────────────────
// Source: DEFRA 2023, IEA 2023

export const GRID_FACTORS: Record<GridRegion, number> = {
  uk: 0.207,
  eu: 0.275,
  us: 0.386,
  india: 0.708,
  china: 0.555,
  australia: 0.510,
  renewables: 0.010,
  coal_heavy: 0.820,
};

// ─── Heating Emission Factors (kg CO₂e per kWh of heat) ─────────────────────
export const HEATING_FACTORS: Record<HeatingType, number> = {
  gas: 0.183,
  oil: 0.247,
  heat_pump: 0.053, // uses grid electricity (UK)
  electric: 0.207, // pure resistance heating
  wood: 0.016, // biomass (near carbon-neutral)
};

// ─── Food Emission Factors (kg CO₂e per person per day) ─────────────────────
// Source: Poore & Nemecek 2018, IPCC AR6 WGIII

export const FOOD_FACTORS: Record<DietType, number> = {
  high_meat: 7.19,
  medium_meat: 5.63,
  low_meat: 4.67,
  flexitarian: 4.67,
  vegetarian: 3.81,
  vegan: 2.89,
};

export const FOOD_WASTE_MULTIPLIERS: Record<FoodWasteLevel, number> = {
  low: 1.0,
  medium: 1.1,
  high: 1.25,
};

export const LOCAL_SOURCING_FACTOR = 0.92; // 8% reduction
export const ORGANIC_FACTOR = 0.94; // 6% reduction

// ─── Shopping Emission Factors ────────────────────────────────────────────────
// Source: DEFRA 2023, WRAP 2022

export const CLOTHING_KG_PER_ITEM = 22.0; // avg garment lifecycle
export const ELECTRONICS_KG_PER_ITEM = 75.0; // avg device (phone ~70, laptop ~280)
export const GENERAL_SPEND_KG_PER_GBP = 0.54; // per £ spent on goods

export const DELIVERY_FACTORS: Record<DeliveryType, number> = {
  standard: 1.0,
  express: 1.35, // expedited air/priority adds ~35%
  click_collect: 0.75, // ~25% less than home delivery
};

// ─── National Averages (kg CO₂e per year) ────────────────────────────────────
// Source: Our World in Data, IEA 2023

export const NATIONAL_AVERAGES: NationalAverage[] = [
  { country: 'United Kingdom', kgPerYear: 5500, gridIntensity: 0.207 },
  { country: 'United States', kgPerYear: 14700, gridIntensity: 0.386 },
  { country: 'Germany', kgPerYear: 7900, gridIntensity: 0.350 },
  { country: 'France', kgPerYear: 4900, gridIntensity: 0.052 },
  { country: 'India', kgPerYear: 1900, gridIntensity: 0.708 },
  { country: 'China', kgPerYear: 8400, gridIntensity: 0.555 },
  { country: 'Australia', kgPerYear: 14400, gridIntensity: 0.510 },
  { country: 'Canada', kgPerYear: 14200, gridIntensity: 0.130 },
  { country: 'Sweden', kgPerYear: 4000, gridIntensity: 0.008 },
  { country: 'Brazil', kgPerYear: 2800, gridIntensity: 0.074 },
  { country: 'Japan', kgPerYear: 8700, gridIntensity: 0.474 },
  { country: 'Other', kgPerYear: 6000, gridIntensity: 0.420 },
];

// ─── 1.5°C Compatible Budget ──────────────────────────────────────────────────
// Source: IPCC SR1.5 — 2.3 tonnes per person per year by 2030

export const TARGET_1_5C_KG_YEAR = 2300;
export const TARGET_2C_KG_YEAR = 3500;
export const GLOBAL_AVERAGE_KG_YEAR = 7000;

// ─── Score Rating Thresholds (kg CO₂e per day) ───────────────────────────────

export const SCORE_THRESHOLDS = {
  excellent: 3.0, // < 3 kg/day → ~1095 kg/year
  good: 6.0, // < 6 kg/day → ~2190 kg/year
  average: 12.0, // < 12 kg/day → ~4380 kg/year
  high: 19.0, // < 19 kg/day → ~6935 kg/year
  very_high: Infinity,
};

// ─── Goal Templates ────────────────────────────────────────────────────────────

export const GOAL_TEMPLATES = [
  {
    id: 'car_free_days',
    title: 'Go car-free 2 days/week',
    description: 'Replace 2 days of car commuting with walking, cycling, or public transport.',
    category: 'transport' as const,
    targetReduction: 35, // kg CO₂e per month
    effort: 'medium' as const,
    icon: '🚴',
  },
  {
    id: 'meat_free_monday',
    title: 'Meat-free Mondays',
    description: 'Skip meat every Monday. Build to 3 meat-free days per week.',
    category: 'food' as const,
    targetReduction: 18,
    effort: 'low' as const,
    icon: '🥗',
  },
  {
    id: 'cut_meat_3x_week',
    title: 'Cut meat to 3x/week',
    description: 'Reduce meat consumption to a maximum of 3 servings per week.',
    category: 'food' as const,
    targetReduction: 40,
    effort: 'medium' as const,
    icon: '🥦',
  },
  {
    id: 'green_energy',
    title: 'Switch to green energy tariff',
    description: 'Move to a renewable energy provider for your home electricity.',
    category: 'energy' as const,
    targetReduction: 55,
    effort: 'low' as const,
    icon: '⚡',
  },
  {
    id: 'install_solar',
    title: 'Install solar panels',
    description: 'Generate your own clean electricity and reduce grid dependence.',
    category: 'energy' as const,
    targetReduction: 120,
    effort: 'high' as const,
    icon: '☀️',
  },
  {
    id: 'no_fly_year',
    title: 'No-fly year',
    description: 'Commit to zero flights for 12 months and explore alternatives.',
    category: 'travel' as const,
    targetReduction: 150,
    effort: 'high' as const,
    icon: '✈️',
  },
  {
    id: 'second_hand_shopping',
    title: 'Buy secondhand only',
    description: 'Source all new clothing from charity shops, Vinted, or eBay.',
    category: 'shopping' as const,
    targetReduction: 22,
    effort: 'low' as const,
    icon: '♻️',
  },
  {
    id: 'ev_switch',
    title: 'Switch to electric vehicle',
    description: 'Replace your petrol/diesel car with an EV or hybrid.',
    category: 'transport' as const,
    targetReduction: 100,
    effort: 'high' as const,
    icon: '🔋',
  },
];

// ─── Countries & Grid Regions ─────────────────────────────────────────────────

export const COUNTRIES_GRID_MAP: Record<string, GridRegion> = {
  'United Kingdom': 'uk',
  'Ireland': 'uk',
  'Germany': 'eu',
  'France': 'eu',
  'Spain': 'eu',
  'Italy': 'eu',
  'Netherlands': 'eu',
  'Belgium': 'eu',
  'Sweden': 'renewables',
  'Norway': 'renewables',
  'Denmark': 'renewables',
  'United States': 'us',
  'Canada': 'us',
  'Australia': 'australia',
  'India': 'india',
  'China': 'china',
  'Japan': 'eu',
  'Other': 'eu',
};

export const COUNTRY_LIST = Object.keys(COUNTRIES_GRID_MAP);
