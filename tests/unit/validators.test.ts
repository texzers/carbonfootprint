import { describe, it, expect } from 'vitest';
import {
  TransportLogSchema,
  EnergyLogSchema,
  FoodLogSchema,
  ShoppingLogSchema,
  TravelLogSchema,
  GoalSchema,
  ProfileSchema,
  OnboardingStep1Schema,
} from '../../src/utils/validators';

describe('TransportLogSchema', () => {
  it('accepts valid transport log', () => {
    const result = TransportLogSchema.safeParse({
      mode: 'petrol_car',
      fuelType: 'petrol',
      distanceKm: 15.5,
      tripsPerWeek: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative distanceKm', () => {
    const result = TransportLogSchema.safeParse({
      mode: 'petrol_car',
      distanceKm: -5,
      tripsPerWeek: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero distanceKm', () => {
    const result = TransportLogSchema.safeParse({
      mode: 'bus',
      distanceKm: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid transport mode', () => {
    const result = TransportLogSchema.safeParse({
      mode: 'helicopter',
      distanceKm: 10,
    });
    expect(result.success).toBe(false);
  });

  it('accepts bike with valid distance', () => {
    const result = TransportLogSchema.safeParse({
      mode: 'bike',
      distanceKm: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects trips per week > 100', () => {
    const result = TransportLogSchema.safeParse({
      mode: 'bus',
      distanceKm: 10,
      tripsPerWeek: 101,
    });
    expect(result.success).toBe(false);
  });
});

describe('EnergyLogSchema', () => {
  it('accepts valid energy log', () => {
    const result = EnergyLogSchema.safeParse({
      kwh: 250,
      heatingType: 'gas',
      occupants: 2,
      greenTariff: false,
      gridRegion: 'uk',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative kWh', () => {
    const result = EnergyLogSchema.safeParse({ kwh: -10 });
    expect(result.success).toBe(false);
  });

  it('rejects occupants below 1', () => {
    const result = EnergyLogSchema.safeParse({ kwh: 100, occupants: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects occupants above 20', () => {
    const result = EnergyLogSchema.safeParse({ kwh: 100, occupants: 25 });
    expect(result.success).toBe(false);
  });
});

describe('FoodLogSchema', () => {
  it('accepts vegan diet', () => {
    const result = FoodLogSchema.safeParse({
      dietType: 'vegan',
      mealsPerDay: 3,
      wasteLevel: 'low',
      locallySourced: true,
      organic: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid diet type', () => {
    const result = FoodLogSchema.safeParse({ dietType: 'carnivore' });
    expect(result.success).toBe(false);
  });

  it('rejects meals per day > 10', () => {
    const result = FoodLogSchema.safeParse({
      dietType: 'vegan',
      mealsPerDay: 15,
    });
    expect(result.success).toBe(false);
  });
});

describe('ShoppingLogSchema', () => {
  it('accepts valid shopping log', () => {
    const result = ShoppingLogSchema.safeParse({
      clothingItems: 2,
      electronicsItems: 0,
      totalSpend: 150,
      deliveryType: 'standard',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative clothing items', () => {
    const result = ShoppingLogSchema.safeParse({
      clothingItems: -1,
      electronicsItems: 0,
      totalSpend: 50,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative spend', () => {
    const result = ShoppingLogSchema.safeParse({
      clothingItems: 0,
      electronicsItems: 0,
      totalSpend: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe('TravelLogSchema', () => {
  it('accepts valid flight log', () => {
    const result = TravelLogSchema.safeParse({
      flights: [{
        origin: 'London',
        destination: 'New York',
        distanceKm: 5540,
        cabinClass: 'economy',
        isReturn: true,
        type: 'long_haul',
      }],
      holidayType: 'international',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty flights array', () => {
    const result = TravelLogSchema.safeParse({ flights: [], holidayType: 'domestic' });
    expect(result.success).toBe(false);
  });

  it('rejects negative flight distance', () => {
    const result = TravelLogSchema.safeParse({
      flights: [{
        origin: 'A', destination: 'B',
        distanceKm: -100, cabinClass: 'economy',
        isReturn: false, type: 'short_haul',
      }],
    });
    expect(result.success).toBe(false);
  });
});

describe('GoalSchema', () => {
  it('accepts valid goal', () => {
    const future = new Date();
    future.setMonth(future.getMonth() + 3);
    const result = GoalSchema.safeParse({
      title: 'Go car-free on Mondays',
      category: 'transport',
      targetReduction: 35,
      deadline: future,
    });
    expect(result.success).toBe(true);
  });

  it('rejects goal title shorter than 3 chars', () => {
    const future = new Date();
    future.setMonth(future.getMonth() + 1);
    const result = GoalSchema.safeParse({
      title: 'Hi',
      category: 'transport',
      targetReduction: 10,
      deadline: future,
    });
    expect(result.success).toBe(false);
  });

  it('rejects past deadline', () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    const result = GoalSchema.safeParse({
      title: 'My Goal',
      category: 'food',
      targetReduction: 20,
      deadline: past,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero target reduction', () => {
    const future = new Date();
    future.setMonth(future.getMonth() + 1);
    const result = GoalSchema.safeParse({
      title: 'My Goal',
      category: 'energy',
      targetReduction: 0,
      deadline: future,
    });
    expect(result.success).toBe(false);
  });
});

describe('ProfileSchema', () => {
  it('accepts valid profile', () => {
    const result = ProfileSchema.safeParse({
      displayName: 'Jane Smith',
      email: 'jane@example.com',
      country: 'United Kingdom',
      city: 'London',
      dietType: 'vegetarian',
      primaryTransport: 'train',
      householdSize: 2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = ProfileSchema.safeParse({
      displayName: 'Jane',
      email: 'not-an-email',
      country: 'UK',
      city: 'London',
      dietType: 'vegan',
      primaryTransport: 'bus',
      householdSize: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty display name', () => {
    const result = ProfileSchema.safeParse({
      displayName: '',
      email: 'test@test.com',
      country: 'UK',
      city: 'London',
      dietType: 'vegan',
      primaryTransport: 'walk',
      householdSize: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects household size below 1', () => {
    const result = ProfileSchema.safeParse({
      displayName: 'Jane',
      email: 'jane@example.com',
      country: 'UK',
      city: 'London',
      dietType: 'vegan',
      primaryTransport: 'walk',
      householdSize: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('OnboardingStep1Schema', () => {
  it('accepts valid location', () => {
    const result = OnboardingStep1Schema.safeParse({
      country: 'United Kingdom',
      city: 'Manchester',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty country', () => {
    const result = OnboardingStep1Schema.safeParse({ country: '', city: 'London' });
    expect(result.success).toBe(false);
  });

  it('rejects empty city', () => {
    const result = OnboardingStep1Schema.safeParse({ country: 'UK', city: '' });
    expect(result.success).toBe(false);
  });
});
