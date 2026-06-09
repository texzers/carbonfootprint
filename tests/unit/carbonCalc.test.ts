import { describe, it, expect } from 'vitest';
import {
  calculateTransportEmissions,
  calculateEnergyEmissions,
  calculateFoodEmissions,
  calculateShoppingEmissions,
  calculateFlightEmissions,
  getTotalDailyEmissions,
  getAnnualProjection,
  compareToTarget,
  formatCO2,
  kgToTrees,
} from '../../src/utils/carbonCalc';

describe('calculateTransportEmissions', () => {
  it('petrol car 10km = 1.70 kg CO₂e', () => {
    const result = calculateTransportEmissions('petrol_car', 10, 'petrol', 1, 'medium');
    expect(result).toBeCloseTo(1.70, 2);
  });

  it('diesel car medium 10km ≈ 1.63 kg CO₂e', () => {
    const result = calculateTransportEmissions('diesel_car', 10, 'diesel', 1, 'medium');
    expect(result).toBeCloseTo(1.63, 2);
  });

  it('EV 10km = 0.53 kg CO₂e', () => {
    const result = calculateTransportEmissions('ev_car', 10, 'ev', 1);
    expect(result).toBeCloseTo(0.53, 2);
  });

  it('bus 10km = 0.89 kg CO₂e', () => {
    const result = calculateTransportEmissions('bus', 10);
    expect(result).toBeCloseTo(0.89, 2);
  });

  it('train 10km = 0.35 kg CO₂e', () => {
    const result = calculateTransportEmissions('train', 10);
    expect(result).toBeCloseTo(0.35, 2);
  });

  it('bike = 0 kg CO₂e', () => {
    expect(calculateTransportEmissions('bike', 100)).toBe(0);
  });

  it('walk = 0 kg CO₂e', () => {
    expect(calculateTransportEmissions('walk', 10)).toBe(0);
  });

  it('distance 0 returns 0', () => {
    expect(calculateTransportEmissions('petrol_car', 0)).toBe(0);
  });

  it('multiplies by trips per week', () => {
    const single = calculateTransportEmissions('petrol_car', 10, 'petrol', 1);
    const five = calculateTransportEmissions('petrol_car', 10, 'petrol', 5);
    expect(five).toBeCloseTo(single * 5, 2);
  });

  it('throws on negative distance', () => {
    expect(() => calculateTransportEmissions('petrol_car', -1)).toThrow();
  });

  it('throws on negative trips', () => {
    expect(() => calculateTransportEmissions('petrol_car', 10, 'petrol', -1)).toThrow();
  });

  it('hybrid car 10km ≈ 1.06 kg CO₂e', () => {
    const result = calculateTransportEmissions('hybrid_car', 10);
    expect(result).toBeCloseTo(1.06, 2);
  });
});

describe('calculateEnergyEmissions', () => {
  it('250 kWh UK grid (0.207) / 1 person = 51.75 kg', () => {
    const result = calculateEnergyEmissions(250, 'uk', 1);
    expect(result).toBeCloseTo(51.75, 1);
  });

  it('divides by number of occupants', () => {
    const single = calculateEnergyEmissions(250, 'uk', 1);
    const four = calculateEnergyEmissions(250, 'uk', 4);
    expect(four).toBeCloseTo(single / 4, 2);
  });

  it('green tariff uses renewables factor (0.010)', () => {
    const normal = calculateEnergyEmissions(250, 'uk', 1, false);
    const green = calculateEnergyEmissions(250, 'uk', 1, true);
    expect(green).toBeLessThan(normal);
    expect(green).toBeCloseTo(250 * 0.010, 2);
  });

  it('throws on negative kWh', () => {
    expect(() => calculateEnergyEmissions(-100, 'uk', 1)).toThrow();
  });

  it('throws on zero occupants', () => {
    expect(() => calculateEnergyEmissions(100, 'uk', 0)).toThrow();
  });

  it('US grid (0.386) higher than UK (0.207)', () => {
    const uk = calculateEnergyEmissions(250, 'uk', 1);
    const us = calculateEnergyEmissions(250, 'us', 1);
    expect(us).toBeGreaterThan(uk);
  });
});

describe('calculateFoodEmissions', () => {
  it('vegan diet daily = 2.89 kg CO₂e', () => {
    const result = calculateFoodEmissions('vegan');
    expect(result).toBeCloseTo(2.89, 2);
  });

  it('high meat diet = 7.19 kg CO₂e', () => {
    const result = calculateFoodEmissions('high_meat');
    expect(result).toBeCloseTo(7.19, 2);
  });

  it('vegetarian = 3.81 kg CO₂e', () => {
    const result = calculateFoodEmissions('vegetarian');
    expect(result).toBeCloseTo(3.81, 2);
  });

  it('high waste multiplier increases emissions', () => {
    const low = calculateFoodEmissions('medium_meat', 'low');
    const high = calculateFoodEmissions('medium_meat', 'high');
    expect(high).toBeGreaterThan(low);
  });

  it('locally sourced reduces emissions by ~8%', () => {
    const normal = calculateFoodEmissions('medium_meat', 'medium', false);
    const local = calculateFoodEmissions('medium_meat', 'medium', true);
    expect(local).toBeCloseTo(normal * 0.92, 2);
  });

  it('organic reduces emissions by ~6%', () => {
    const normal = calculateFoodEmissions('medium_meat', 'medium', false, false);
    const organic = calculateFoodEmissions('medium_meat', 'medium', false, true);
    expect(organic).toBeCloseTo(normal * 0.94, 2);
  });

  it('meals per day scales proportionally', () => {
    const three = calculateFoodEmissions('medium_meat', 'medium', false, false, 3);
    const six = calculateFoodEmissions('medium_meat', 'medium', false, false, 6);
    expect(six).toBeCloseTo(three * 2, 2);
  });
});

describe('calculateShoppingEmissions', () => {
  it('10 clothing items = 220 kg CO₂e', () => {
    const result = calculateShoppingEmissions(10, 0, 0);
    expect(result).toBeCloseTo(220, 1);
  });

  it('1 electronics item = ~6.25 kg/month', () => {
    // 1 item/year = 75 / 12 = 6.25 per month
    const result = calculateShoppingEmissions(0, 1, 0);
    expect(result).toBeCloseTo(75 / 12, 2);
  });

  it('express delivery adds ~35% vs standard', () => {
    const standard = calculateShoppingEmissions(0, 0, 100, 'standard');
    const express = calculateShoppingEmissions(0, 0, 100, 'express');
    expect(express).toBeCloseTo(standard * 1.35, 2);
  });

  it('click & collect reduces by ~25%', () => {
    const standard = calculateShoppingEmissions(0, 0, 100, 'standard');
    const collect = calculateShoppingEmissions(0, 0, 100, 'click_collect');
    expect(collect).toBeCloseTo(standard * 0.75, 2);
  });

  it('throws on negative inputs', () => {
    expect(() => calculateShoppingEmissions(-1, 0, 0)).toThrow();
    expect(() => calculateShoppingEmissions(0, -1, 0)).toThrow();
    expect(() => calculateShoppingEmissions(0, 0, -100)).toThrow();
  });

  it('all zeros returns 0', () => {
    expect(calculateShoppingEmissions(0, 0, 0)).toBe(0);
  });
});

describe('calculateFlightEmissions', () => {
  it('long-haul flight applies RFI 1.9x multiplier', () => {
    const distance = 5000;
    // economy long-haul factor = 0.195, RFI = 1.9x
    const expected = distance * 0.195 * 1.9;
    const result = calculateFlightEmissions(distance, 'economy', false);
    expect(result).toBeCloseTo(expected, 1);
  });

  it('return flight doubles the distance calculation', () => {
    const oneWay = calculateFlightEmissions(5000, 'economy', false);
    const returnFlight = calculateFlightEmissions(5000, 'economy', true);
    expect(returnFlight).toBeCloseTo(oneWay * 2, 2);
  });

  it('short-haul (< 3700km) uses higher factor', () => {
    const shortHaul = calculateFlightEmissions(1000, 'economy', false);
    const longHaul = calculateFlightEmissions(1000, 'economy', false);
    // Short-haul factor = 0.255 > long-haul 0.195
    const expectedShort = 1000 * 0.255 * 1.9;
    expect(shortHaul).toBeCloseTo(expectedShort, 1);
  });

  it('business class higher than economy', () => {
    const economy = calculateFlightEmissions(8000, 'economy', false);
    const business = calculateFlightEmissions(8000, 'business', false);
    expect(business).toBeGreaterThan(economy);
  });

  it('first class highest emissions', () => {
    const business = calculateFlightEmissions(8000, 'business', false);
    const first = calculateFlightEmissions(8000, 'first', false);
    expect(first).toBeGreaterThan(business);
  });

  it('throws on zero or negative distance', () => {
    expect(() => calculateFlightEmissions(0, 'economy', false)).toThrow();
    expect(() => calculateFlightEmissions(-100, 'economy', false)).toThrow();
  });
});

describe('getTotalDailyEmissions', () => {
  it('sums all categories correctly', () => {
    const result = getTotalDailyEmissions({
      transport: 1.7,
      energy: 0.5,
      food: 2.89,
      shopping: 0.3,
      travel: 0,
    });
    expect(result.total).toBeCloseTo(5.39, 2);
    expect(result.transport).toBe(1.7);
    expect(result.food).toBe(2.89);
  });

  it('defaults missing categories to 0', () => {
    const result = getTotalDailyEmissions({ food: 2.89 });
    expect(result.transport).toBe(0);
    expect(result.energy).toBe(0);
    expect(result.total).toBe(2.89);
  });
});

describe('getAnnualProjection', () => {
  it('daily 6.3 kg → ~2300 kg/year', () => {
    const result = getAnnualProjection(6.3);
    expect(result).toBeCloseTo(6.3 * 365, 0);
  });

  it('vegan daily 2.89 → ~1055 kg/year', () => {
    const result = getAnnualProjection(2.89);
    expect(result).toBeCloseTo(1054.85, 0);
  });
});

describe('compareToTarget', () => {
  it('annual below target returns isUnderTarget = true', () => {
    const result = compareToTarget(2000);
    expect(result.isUnderTarget).toBe(true);
    expect(result.differenceKg).toBeLessThan(0);
  });

  it('annual above target returns isUnderTarget = false', () => {
    const result = compareToTarget(5000);
    expect(result.isUnderTarget).toBe(false);
    expect(result.differenceKg).toBeGreaterThan(0);
  });

  it('exactly at target returns isUnderTarget = true', () => {
    const result = compareToTarget(2300);
    expect(result.isUnderTarget).toBe(true);
    expect(result.differenceKg).toBe(0);
  });
});

describe('formatCO2', () => {
  it('formats kg below 1000 correctly', () => {
    expect(formatCO2(500)).toBe('500.0 kg CO₂e');
  });

  it('formats tonnes above 1000 correctly', () => {
    expect(formatCO2(2300)).toBe('2.3t CO₂e');
  });

  it('rounds to specified decimal places', () => {
    expect(formatCO2(1.234, 2)).toBe('1.23 kg CO₂e');
  });
});

describe('kgToTrees', () => {
  it('21.7 kg = 1 tree', () => {
    expect(kgToTrees(21.7)).toBe(1);
  });

  it('zero returns 0', () => {
    expect(kgToTrees(0)).toBe(0);
  });
});
