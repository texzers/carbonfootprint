import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '../../store';
import { addCarbonLog } from '../../services/firestore';
import {
  TransportLogSchema,
  EnergyLogSchema,
  FoodLogSchema,
  ShoppingLogSchema,
  TravelLogSchema,
} from '../../utils/validators';
import {
  calculateTransportEmissions,
  calculateEnergyEmissions,
  calculateFoodEmissions,
  calculateShoppingEmissions,
  calculateFlightEmissions,
  formatCO2,
} from '../../utils/carbonCalc';
import {
  Button, Card, FormField, Input, Toggle, Slider, Select, SectionHeader, Badge,
} from '../shared';
import { MapDistanceModal } from '../maps/MapDistanceModal';
import { COUNTRIES_GRID_MAP } from '../../constants/emissionFactors';
import type {
  TransportMode, FuelType, DietType, FoodWasteLevel,
  DeliveryType, CabinClass, FlightType, HeatingType, GridRegion,
} from '../../types';

const TABS = [
  { id: 'transport', label: 'Transport', icon: '🚗' },
  { id: 'energy', label: 'Home Energy', icon: '🏠' },
  { id: 'food', label: 'Food', icon: '🍔' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
];

const TRANSPORT_MODES: Array<{ value: TransportMode; label: string; icon: string }> = [
  { value: 'petrol_car', label: 'Petrol Car', icon: '🚗' },
  { value: 'diesel_car', label: 'Diesel Car', icon: '🚙' },
  { value: 'ev_car', label: 'Electric Car', icon: '⚡' },
  { value: 'hybrid_car', label: 'Hybrid', icon: '🔋' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'train', label: 'Train', icon: '🚂' },
  { value: 'bike', label: 'Bike', icon: '🚴' },
  { value: 'walk', label: 'Walk', icon: '🚶' },
];

export function ActivityLogger() {
  const [activeTab, setActiveTab] = useState<string>('transport');

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-eco-ink">Log Activity</h1>
        <p className="text-eco-slate text-sm mt-1">
          Track your carbon footprint — real-time calculations as you type.
        </p>
      </div>

      {/* Category tabs */}
      <div
        role="tablist"
        aria-label="Emission categories"
        className="flex gap-2 mb-6 overflow-x-auto pb-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eco-leaf ${
              activeTab === tab.id
                ? 'bg-eco-forest text-white shadow-sm'
                : 'bg-white text-eco-slate border border-gray-100 hover:border-eco-mint hover:text-eco-ink'
            }`}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'transport' && <TransportForm />}
        {activeTab === 'energy' && <EnergyForm />}
        {activeTab === 'food' && <FoodForm />}
        {activeTab === 'shopping' && <ShoppingForm />}
        {activeTab === 'travel' && <TravelForm />}
      </div>
    </div>
  );
}

// ─── Emission Preview ─────────────────────────────────────────────────────────

function EmissionPreview({ kgCO2e }: { kgCO2e: number }) {
  if (!kgCO2e || isNaN(kgCO2e)) return null;
  return (
    <div className="mt-4 p-4 bg-eco-mist rounded-xl border border-eco-mint/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-eco-slate font-medium uppercase tracking-wide">Estimated emission</p>
          <p className="font-display font-bold text-2xl text-eco-forest mt-0.5">
            {formatCO2(kgCO2e)}
          </p>
        </div>
        <div className="text-right text-xs text-eco-slate">
          <p>≈ {(kgCO2e / 365 * 100).toFixed(1)}% of daily budget</p>
          <p className="mt-0.5">Source: IPCC AR6 + DEFRA 2023</p>
        </div>
      </div>
    </div>
  );
}

// ─── Transport Form ───────────────────────────────────────────────────────────

function TransportForm() {
  const { user, profile, addNotification } = useAppStore();
  const [selectedMode, setSelectedMode] = useState<TransportMode>('petrol_car');
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [fuelType, setFuelType] = useState<FuelType>('petrol');
  const [tripsPerWeek, setTripsPerWeek] = useState<number>(5);
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const emission = useMemo(() => {
    if (!distanceKm) return 0;
    try {
      return calculateTransportEmissions(selectedMode, distanceKm, fuelType, tripsPerWeek);
    } catch { return 0; }
  }, [selectedMode, distanceKm, fuelType, tripsPerWeek]);

  const isCarMode = ['petrol_car', 'diesel_car', 'ev_car', 'hybrid_car'].includes(selectedMode);

  const handleSave = async () => {
    if (!user || !distanceKm) return;
    setSaving(true);
    try {
      await addCarbonLog(user.uid, {
        date: new Date(),
        category: 'transport',
        subcategory: selectedMode,
        activity: `${selectedMode.replace(/_/g, ' ')} — ${distanceKm} km`,
        kgCO2e: emission,
        source: 'manual',
        metadata: { mode: selectedMode, fuelType, distanceKm, tripsPerWeek },
      });
      addNotification({ type: 'success', message: `Logged: ${formatCO2(emission)} CO₂e` });
      setDistanceKm(0);
    } catch {
      addNotification({ type: 'error', message: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <SectionHeader title="Transport 🚗" subtitle="How did you get around?" />

      {/* Mode selector */}
      <div className="mb-5">
        <p className="text-sm font-medium text-eco-ink mb-2">Transport mode</p>
        <div className="grid grid-cols-4 gap-2">
          {TRANSPORT_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setSelectedMode(m.value)}
              aria-pressed={selectedMode === m.value}
              className={`p-2.5 rounded-xl border-2 text-center transition-all text-xs ${
                selectedMode === m.value
                  ? 'border-eco-leaf bg-eco-mist font-semibold text-eco-forest'
                  : 'border-gray-100 hover:border-eco-mint text-eco-slate'
              }`}
            >
              <div className="text-xl mb-1" aria-hidden="true">{m.icon}</div>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fuel type (cars only) */}
      {isCarMode && (
        <FormField label="Fuel type" htmlFor="fuelType" className="mb-4">
          <Select
            id="fuelType"
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value as FuelType)}
            options={[
              { value: 'petrol', label: 'Petrol' },
              { value: 'diesel', label: 'Diesel' },
              { value: 'ev', label: 'Electric (EV)' },
              { value: 'hybrid', label: 'Hybrid' },
            ]}
          />
        </FormField>
      )}

      {/* Distance */}
      <div className="mb-4">
        <FormField label="Distance (one way)" htmlFor="distance" required hint="Enter distance or use Google Maps to calculate it">
          <div className="flex gap-2">
            <Input
              id="distance"
              type="number"
              min="0"
              step="0.1"
              value={distanceKm || ''}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              placeholder="0"
            />
            <div className="flex items-center px-3 bg-eco-mist rounded-xl text-sm font-medium text-eco-forest shrink-0">km</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMapsModal(true)}
              className="shrink-0"
              aria-label="Open Google Maps to calculate distance"
            >
              📍 Maps
            </Button>
          </div>
        </FormField>
      </div>

      {/* Weekly trips */}
      <div className="mb-4">
        <Slider
          id="tripsPerWeek"
          label="Trips per week"
          value={tripsPerWeek}
          min={1}
          max={21}
          onChange={setTripsPerWeek}
          unit=" trips"
        />
      </div>

      <EmissionPreview kgCO2e={emission} />

      <Button
        onClick={handleSave}
        disabled={!distanceKm || emission === 0}
        loading={saving}
        fullWidth
        className="mt-4"
        size="lg"
      >
        Log Entry
      </Button>

      {showMapsModal && (
        <MapDistanceModal
          onClose={() => setShowMapsModal(false)}
          onDistanceSelected={(km) => {
            setDistanceKm(km);
            setShowMapsModal(false);
          }}
        />
      )}
    </Card>
  );
}

// ─── Energy Form ──────────────────────────────────────────────────────────────

function EnergyForm() {
  const { user, profile, addNotification } = useAppStore();
  const [kwh, setKwh] = useState<number>(250);
  const [heatingKwh, setHeatingKwh] = useState<number>(100);
  const [heatingType, setHeatingType] = useState<HeatingType>('gas');
  const [occupants, setOccupants] = useState<number>(profile?.householdSize ?? 2);
  const [greenTariff, setGreenTariff] = useState<boolean>(profile?.hasGreenTariff ?? false);
  const [saving, setSaving] = useState(false);

  const gridRegion: GridRegion =
    profile?.gridRegion ??
    (profile?.country ? COUNTRIES_GRID_MAP[profile.country] ?? 'eu' : 'eu');

  const emission = useMemo(() => {
    try {
      return calculateEnergyEmissions(kwh, gridRegion, occupants, greenTariff, heatingKwh, heatingType);
    } catch { return 0; }
  }, [kwh, gridRegion, occupants, greenTariff, heatingKwh, heatingType]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await addCarbonLog(user.uid, {
        date: new Date(),
        category: 'energy',
        subcategory: heatingType,
        activity: `Home energy — ${kwh} kWh electricity, ${heatingKwh} kWh ${heatingType}`,
        kgCO2e: emission,
        source: 'manual',
        metadata: { kwh, heatingType, heatingKwh, occupants, greenTariff, gridRegion },
      });
      addNotification({ type: 'success', message: `Logged: ${formatCO2(emission)} CO₂e` });
    } catch {
      addNotification({ type: 'error', message: 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <SectionHeader title="Home Energy 🏠" subtitle="Monthly energy consumption" />
      <div className="space-y-5">
        <Slider id="kwh" label="Monthly electricity use" value={kwh} min={0} max={2000} step={10} onChange={setKwh} unit=" kWh" />
        <FormField label="Heating type" htmlFor="heatingType">
          <Select
            id="heatingType"
            value={heatingType}
            onChange={(e) => setHeatingType(e.target.value as HeatingType)}
            options={[
              { value: 'gas', label: 'Gas boiler' },
              { value: 'oil', label: 'Oil heating' },
              { value: 'heat_pump', label: 'Heat pump' },
              { value: 'electric', label: 'Electric heating' },
              { value: 'wood', label: 'Wood / biomass' },
            ]}
          />
        </FormField>
        <Slider id="heatingKwh" label="Monthly heating use" value={heatingKwh} min={0} max={1500} step={10} onChange={setHeatingKwh} unit=" kWh" />
        <Slider id="occupants" label="Household occupants" value={occupants} min={1} max={10} onChange={setOccupants} unit=" people" />
        <Toggle id="greenTariff" label="I'm on a green / renewable energy tariff" checked={greenTariff} onChange={setGreenTariff} />
      </div>
      <EmissionPreview kgCO2e={emission} />
      <Button onClick={handleSave} loading={saving} fullWidth className="mt-4" size="lg">Log Entry</Button>
    </Card>
  );
}

// ─── Food Form ────────────────────────────────────────────────────────────────

function FoodForm() {
  const { user, profile, addNotification } = useAppStore();
  const [dietType, setDietType] = useState<DietType>(profile?.dietType ?? 'medium_meat');
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [wasteLevel, setWasteLevel] = useState<FoodWasteLevel>('medium');
  const [locallySourced, setLocallySourced] = useState(false);
  const [organic, setOrganic] = useState(false);
  const [saving, setSaving] = useState(false);

  const DIET_OPTIONS: Array<{ value: DietType; label: string; icon: string }> = [
    { value: 'vegan', label: 'Vegan', icon: '🌱' },
    { value: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
    { value: 'flexitarian', label: 'Flexitarian', icon: '🥙' },
    { value: 'low_meat', label: 'Low meat', icon: '🍗' },
    { value: 'medium_meat', label: 'Meat-eater', icon: '🥩' },
    { value: 'high_meat', label: 'High meat', icon: '🍖' },
  ];

  const emission = useMemo(() => {
    try {
      return calculateFoodEmissions(dietType, wasteLevel, locallySourced, organic, mealsPerDay);
    } catch { return 0; }
  }, [dietType, wasteLevel, locallySourced, organic, mealsPerDay]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await addCarbonLog(user.uid, {
        date: new Date(),
        category: 'food',
        subcategory: dietType,
        activity: `${dietType.replace(/_/g, ' ')} diet — ${mealsPerDay} meals/day`,
        kgCO2e: emission,
        source: 'manual',
        metadata: { dietType, mealsPerDay, wasteLevel, locallySourced, organic },
      });
      addNotification({ type: 'success', message: `Logged: ${formatCO2(emission)} CO₂e` });
    } catch {
      addNotification({ type: 'error', message: 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <SectionHeader title="Food 🍔" subtitle="Daily food footprint" />
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-eco-ink mb-2">Diet type</p>
          <div className="grid grid-cols-3 gap-2">
            {DIET_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => setDietType(opt.value)}
                aria-pressed={dietType === opt.value}
                className={`p-3 rounded-xl border-2 text-center transition-all ${dietType === opt.value ? 'border-eco-leaf bg-eco-mist' : 'border-gray-100 hover:border-eco-mint'}`}>
                <div className="text-xl mb-1" aria-hidden="true">{opt.icon}</div>
                <div className="text-xs font-medium text-eco-ink">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>
        <Slider id="mealsPerDay" label="Meals per day" value={mealsPerDay} min={1} max={6} onChange={setMealsPerDay} unit=" meals" />
        <FormField label="Food waste level" htmlFor="wasteLevel">
          <Select id="wasteLevel" value={wasteLevel} onChange={(e) => setWasteLevel(e.target.value as FoodWasteLevel)}
            options={[{ value: 'low', label: '🟢 Low (meal plan, minimal waste)' }, { value: 'medium', label: '🟡 Medium (some waste)' }, { value: 'high', label: '🔴 High (significant waste)' }]} />
        </FormField>
        <Toggle id="locallySourced" label="Mostly locally sourced food" description="Reduces transport emissions by ~8%" checked={locallySourced} onChange={setLocallySourced} />
        <Toggle id="organic" label="Predominantly organic produce" description="Reduces chemical/energy intensive farming by ~6%" checked={organic} onChange={setOrganic} />
      </div>
      <EmissionPreview kgCO2e={emission} />
      <Button onClick={handleSave} loading={saving} fullWidth className="mt-4" size="lg">Log Entry</Button>
    </Card>
  );
}

// ─── Shopping Form ────────────────────────────────────────────────────────────

function ShoppingForm() {
  const { user, addNotification } = useAppStore();
  const [clothingItems, setClothingItems] = useState(0);
  const [electronicsItems, setElectronicsItems] = useState(0);
  const [totalSpend, setTotalSpend] = useState(0);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('standard');
  const [saving, setSaving] = useState(false);

  const emission = useMemo(() => {
    try { return calculateShoppingEmissions(clothingItems, electronicsItems, totalSpend, deliveryType); }
    catch { return 0; }
  }, [clothingItems, electronicsItems, totalSpend, deliveryType]);

  const handleSave = async () => {
    if (!user || emission === 0) return;
    setSaving(true);
    try {
      await addCarbonLog(user.uid, {
        date: new Date(),
        category: 'shopping',
        subcategory: 'goods',
        activity: `Shopping — ${clothingItems} clothing, ${electronicsItems} electronics, £${totalSpend} spend`,
        kgCO2e: emission,
        source: 'manual',
        metadata: { clothingItems, electronicsItems, totalSpend, currency: 'GBP', deliveryType },
      });
      addNotification({ type: 'success', message: `Logged: ${formatCO2(emission)} CO₂e` });
      setClothingItems(0); setElectronicsItems(0); setTotalSpend(0);
    } catch {
      addNotification({ type: 'error', message: 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <SectionHeader title="Shopping 🛍️" subtitle="Monthly purchases" />
      <div className="space-y-5">
        <Slider id="clothingItems" label="New clothing items this month" value={clothingItems} min={0} max={30} onChange={setClothingItems} unit=" items" />
        <Slider id="electronicsItems" label="New electronics this year" value={electronicsItems} min={0} max={20} onChange={setElectronicsItems} unit=" items" />
        <FormField label="Total goods spend (£)" htmlFor="totalSpend">
          <Input id="totalSpend" type="number" min="0" value={totalSpend || ''} onChange={(e) => setTotalSpend(Number(e.target.value))} placeholder="0" />
        </FormField>
        <FormField label="Preferred delivery method" htmlFor="deliveryType">
          <Select id="deliveryType" value={deliveryType} onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
            options={[{ value: 'standard', label: '📦 Standard delivery' }, { value: 'express', label: '🚀 Express / next-day' }, { value: 'click_collect', label: '🏪 Click & collect' }]} />
        </FormField>
      </div>
      <EmissionPreview kgCO2e={emission} />
      <Button onClick={handleSave} disabled={emission === 0} loading={saving} fullWidth className="mt-4" size="lg">Log Entry</Button>
    </Card>
  );
}

// ─── Travel / Flights Form ────────────────────────────────────────────────────

function TravelForm() {
  const { user, addNotification } = useAppStore();
  const [flights, setFlights] = useState([{ origin: '', destination: '', distanceKm: 0, cabinClass: 'economy' as CabinClass, isReturn: true, type: 'long_haul' as FlightType }]);
  const [saving, setSaving] = useState(false);

  const totalEmission = useMemo(() => {
    return flights.reduce((sum, f) => {
      if (!f.distanceKm) return sum;
      try { return sum + calculateFlightEmissions(f.distanceKm, f.cabinClass, f.isReturn); }
      catch { return sum; }
    }, 0);
  }, [flights]);

  const addFlight = () => setFlights([...flights, { origin: '', destination: '', distanceKm: 0, cabinClass: 'economy', isReturn: true, type: 'long_haul' }]);
  const removeFlight = (i: number) => setFlights(flights.filter((_, idx) => idx !== i));
  const updateFlight = (i: number, key: string, value: any) => {
    setFlights(flights.map((f, idx) => idx === i ? { ...f, [key]: value } : f));
  };

  const handleSave = async () => {
    if (!user || totalEmission === 0) return;
    setSaving(true);
    try {
      await addCarbonLog(user.uid, {
        date: new Date(),
        category: 'travel',
        subcategory: 'flight',
        activity: `Flight(s): ${flights.map((f) => `${f.origin}→${f.destination}`).join(', ')}`,
        kgCO2e: totalEmission,
        source: 'manual',
        metadata: { flights, holidayType: 'international' },
      });
      addNotification({ type: 'success', message: `Logged: ${formatCO2(totalEmission)} CO₂e` });
    } catch {
      addNotification({ type: 'error', message: 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <SectionHeader title="Travel ✈️" subtitle="Flights & holidays" action={
        <Button size="sm" variant="outline" onClick={addFlight}>+ Add flight</Button>
      } />
      <div className="space-y-4">
        {flights.map((flight, i) => (
          <div key={i} className="p-4 rounded-xl border border-gray-100 bg-eco-mist/30">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold text-eco-ink">Flight {i + 1}</p>
              {flights.length > 1 && (
                <button onClick={() => removeFlight(i)} className="text-xs text-eco-slate hover:text-red-500" aria-label={`Remove flight ${i + 1}`}>Remove</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Origin" htmlFor={`origin-${i}`}>
                <Input id={`origin-${i}`} placeholder="e.g. London" value={flight.origin} onChange={(e) => updateFlight(i, 'origin', e.target.value)} />
              </FormField>
              <FormField label="Destination" htmlFor={`dest-${i}`}>
                <Input id={`dest-${i}`} placeholder="e.g. New York" value={flight.destination} onChange={(e) => updateFlight(i, 'destination', e.target.value)} />
              </FormField>
              <FormField label="Distance (km)" htmlFor={`dist-${i}`}>
                <Input id={`dist-${i}`} type="number" min="0" value={flight.distanceKm || ''} onChange={(e) => updateFlight(i, 'distanceKm', Number(e.target.value))} placeholder="0" />
              </FormField>
              <FormField label="Cabin class" htmlFor={`cabin-${i}`}>
                <Select id={`cabin-${i}`} value={flight.cabinClass} onChange={(e) => updateFlight(i, 'cabinClass', e.target.value)}
                  options={[{ value: 'economy', label: 'Economy' }, { value: 'premium_economy', label: 'Premium Economy' }, { value: 'business', label: 'Business' }, { value: 'first', label: 'First Class' }]} />
              </FormField>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <Toggle id={`return-${i}`} label="Return flight" checked={flight.isReturn} onChange={(v) => updateFlight(i, 'isReturn', v)} />
              <Select value={flight.type} onChange={(e) => updateFlight(i, 'type', e.target.value)}
                options={[{ value: 'short_haul', label: 'Short-haul (< 3700km)' }, { value: 'long_haul', label: 'Long-haul' }]}
                className="text-xs flex-1" />
            </div>
          </div>
        ))}
      </div>
      <EmissionPreview kgCO2e={totalEmission} />
      <div className="mt-2 text-xs text-eco-slate text-center">
        ⚠️ Includes radiative forcing index (1.9×) for high-altitude warming effects
      </div>
      <Button onClick={handleSave} disabled={totalEmission === 0} loading={saving} fullWidth className="mt-4" size="lg">Log Entry</Button>
    </Card>
  );
}
