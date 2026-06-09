import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '../../store';
import { saveUserProfile } from '../../services/firestore';
import {
  OnboardingStep1Schema,
  OnboardingStep2Schema,
  OnboardingStep3Schema,
  OnboardingStep4Schema,
} from '../../utils/validators';
import {
  Button,
  FormField,
  Input,
  Select,
  Toggle,
  Slider,
  Card,
} from '../shared';
import { COUNTRY_LIST, COUNTRIES_GRID_MAP, GOAL_TEMPLATES } from '../../constants/emissionFactors';
import type { DietType, TransportMode } from '../../types';

const STEPS = ['Location', 'Lifestyle', 'Baseline', 'Goals'];

const DIET_OPTIONS: Array<{ value: DietType; label: string; icon: string; desc: string }> = [
  { value: 'vegan', label: 'Vegan', icon: '🌱', desc: 'No animal products' },
  { value: 'vegetarian', label: 'Vegetarian', icon: '🥗', desc: 'No meat or fish' },
  { value: 'flexitarian', label: 'Flexitarian', icon: '🥙', desc: 'Mostly plant-based' },
  { value: 'low_meat', label: 'Low meat', icon: '🍗', desc: 'Meat 1-3x/week' },
  { value: 'medium_meat', label: 'Meat-eater', icon: '🥩', desc: 'Meat most days' },
  { value: 'high_meat', label: 'High meat', icon: '🍖', desc: 'Meat every meal' },
];

const TRANSPORT_OPTIONS: Array<{ value: TransportMode; label: string; icon: string }> = [
  { value: 'walk', label: 'Walk/Cycle', icon: '🚶' },
  { value: 'bike', label: 'Bike', icon: '🚴' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'train', label: 'Train', icon: '🚂' },
  { value: 'ev_car', label: 'Electric Car', icon: '⚡' },
  { value: 'hybrid_car', label: 'Hybrid Car', icon: '🔋' },
  { value: 'petrol_car', label: 'Petrol Car', icon: '🚗' },
  { value: 'diesel_car', label: 'Diesel Car', icon: '🚙' },
];

export function OnboardingWizard() {
  const { user, onboardingStep, setOnboardingStep, setIsOnboarding, setProfile } = useAppStore();
  const [onboardingData, setOnboardingData] = useState<Record<string, any>>({});

  const currentStep = onboardingStep;

  const handleStepComplete = async (stepData: Record<string, any>) => {
    const merged = { ...onboardingData, ...stepData };
    setOnboardingData(merged);

    if (currentStep < 4) {
      setOnboardingStep(currentStep + 1);
      if (user) {
        await saveUserProfile(user.uid, {
          ...merged,
          onboardingStep: currentStep + 1,
        });
      }
    } else {
      // Final step — complete onboarding
      const finalProfile = {
        ...merged,
        onboardingComplete: true,
        onboardingStep: 4,
        gridRegion: COUNTRIES_GRID_MAP[merged.country] ?? 'eu',
      };
      if (user) {
        await saveUserProfile(user.uid, finalProfile);
        setProfile({ ...finalProfile, uid: user.uid } as any);
      }
      setIsOnboarding(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setOnboardingStep(currentStep - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-eco-mist via-white to-eco-mint/20 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4" aria-label={`Step ${currentStep} of ${STEPS.length}: ${STEPS[currentStep - 1]}`}>
            {STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
                    i + 1 < currentStep
                      ? 'bg-eco-leaf text-white'
                      : i + 1 === currentStep
                      ? 'bg-eco-forest text-white ring-4 ring-eco-mint/30'
                      : 'bg-eco-mist text-eco-slate'
                  }`}
                  aria-current={i + 1 === currentStep ? 'step' : undefined}
                >
                  {i + 1 < currentStep ? '✓' : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-12 transition-all duration-500 ${i + 1 < currentStep ? 'bg-eco-leaf' : 'bg-eco-mist'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-eco-slate text-sm">
            Step {currentStep} of {STEPS.length}: <span className="font-semibold text-eco-ink">{STEPS[currentStep - 1]}</span>
          </p>
        </div>

        {/* Step content */}
        <Card className="p-8" elevated>
          {currentStep === 1 && (
            <Step1Location onComplete={handleStepComplete} />
          )}
          {currentStep === 2 && (
            <Step2Lifestyle onComplete={handleStepComplete} onBack={handleBack} />
          )}
          {currentStep === 3 && (
            <Step3Baseline onComplete={handleStepComplete} onBack={handleBack} />
          )}
          {currentStep === 4 && (
            <Step4Goals onComplete={handleStepComplete} onBack={handleBack} />
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Step 1: Location ─────────────────────────────────────────────────────────

function Step1Location({ onComplete }: { onComplete: (data: any) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(OnboardingStep1Schema),
  });

  return (
    <form onSubmit={handleSubmit(onComplete)} noValidate>
      <div className="mb-6">
        <div className="text-3xl mb-2" aria-hidden="true">📍</div>
        <h2 className="font-display font-bold text-2xl text-eco-ink">Where are you based?</h2>
        <p className="text-eco-slate text-sm mt-1">This calibrates your electricity grid emission factor.</p>
      </div>

      <div className="space-y-4">
        <FormField label="Country" htmlFor="country" error={errors.country?.message as string} required>
          <select
            id="country"
            {...register('country')}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eco-leaf"
          >
            <option value="">Select your country…</option>
            {COUNTRY_LIST.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FormField>

        <FormField label="City" htmlFor="city" error={errors.city?.message as string} required>
          <Input
            id="city"
            placeholder="e.g. London"
            error={!!errors.city}
            {...register('city')}
          />
        </FormField>
      </div>

      <Button type="submit" fullWidth className="mt-6" size="lg">
        Continue →
      </Button>
    </form>
  );
}

// ─── Step 2: Lifestyle ────────────────────────────────────────────────────────

function Step2Lifestyle({ onComplete, onBack }: { onComplete: (data: any) => void; onBack: () => void }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(OnboardingStep2Schema),
    defaultValues: { householdSize: 2, homeSize: 85, hasGreenTariff: false },
  });

  const selectedDiet = watch('dietType');
  const selectedTransport = watch('primaryTransport');
  const householdSize = watch('householdSize');

  return (
    <form onSubmit={handleSubmit(onComplete)} noValidate>
      <div className="mb-6">
        <div className="text-3xl mb-2" aria-hidden="true">🏡</div>
        <h2 className="font-display font-bold text-2xl text-eco-ink">Your lifestyle</h2>
        <p className="text-eco-slate text-sm mt-1">Tell us about your diet and transport habits.</p>
      </div>

      <div className="space-y-6">
        {/* Diet */}
        <div>
          <p className="text-sm font-medium text-eco-ink mb-2">Diet type</p>
          <div className="grid grid-cols-3 gap-2">
            {DIET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('dietType', opt.value)}
                className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                  selectedDiet === opt.value
                    ? 'border-eco-leaf bg-eco-mist'
                    : 'border-gray-100 hover:border-eco-mint'
                }`}
                aria-pressed={selectedDiet === opt.value}
              >
                <div className="text-xl mb-1" aria-hidden="true">{opt.icon}</div>
                <div className="text-xs font-medium text-eco-ink">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Transport */}
        <div>
          <p className="text-sm font-medium text-eco-ink mb-2">Primary transport</p>
          <div className="grid grid-cols-4 gap-2">
            {TRANSPORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('primaryTransport', opt.value)}
                className={`p-2 rounded-xl border-2 text-center transition-all ${
                  selectedTransport === opt.value
                    ? 'border-eco-leaf bg-eco-mist'
                    : 'border-gray-100 hover:border-eco-mint'
                }`}
                aria-pressed={selectedTransport === opt.value}
              >
                <div className="text-lg mb-0.5" aria-hidden="true">{opt.icon}</div>
                <div className="text-xs text-eco-slate">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Household */}
        <Slider
          id="householdSize"
          label="Household size"
          value={householdSize}
          min={1}
          max={10}
          onChange={(v) => setValue('householdSize', v)}
          unit=" people"
        />

        {/* Green tariff */}
        <Toggle
          id="hasGreenTariff"
          label="I'm on a green/renewable energy tariff"
          description="Reduces your electricity grid emission factor significantly"
          checked={!!watch('hasGreenTariff')}
          onChange={(v) => setValue('hasGreenTariff', v)}
        />
      </div>

      <div className="flex gap-3 mt-6">
        <Button type="button" variant="ghost" onClick={onBack} className="flex-1">← Back</Button>
        <Button type="submit" className="flex-1" size="lg">Continue →</Button>
      </div>
    </form>
  );
}

// ─── Step 3: Baseline ─────────────────────────────────────────────────────────

function Step3Baseline({ onComplete, onBack }: { onComplete: (data: any) => void; onBack: () => void }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(OnboardingStep3Schema),
    defaultValues: { weeklyCarKm: 100, monthlyFlights: 0, monthlyEnergyKwh: 250 },
  });

  return (
    <form onSubmit={handleSubmit(onComplete)} noValidate>
      <div className="mb-6">
        <div className="text-3xl mb-2" aria-hidden="true">📊</div>
        <h2 className="font-display font-bold text-2xl text-eco-ink">Current habits</h2>
        <p className="text-eco-slate text-sm mt-1">Rough estimates help us calculate your baseline footprint.</p>
      </div>

      <div className="space-y-6">
        <Slider
          id="weeklyCarKm"
          label="Weekly car travel"
          value={watch('weeklyCarKm')}
          min={0}
          max={1000}
          step={10}
          onChange={(v) => setValue('weeklyCarKm', v)}
          unit=" km"
        />

        <Slider
          id="monthlyFlights"
          label="Flights per year"
          value={watch('monthlyFlights')}
          min={0}
          max={30}
          onChange={(v) => setValue('monthlyFlights', v)}
          unit=" flights"
        />

        <Slider
          id="monthlyEnergyKwh"
          label="Monthly electricity use"
          value={watch('monthlyEnergyKwh')}
          min={50}
          max={1000}
          step={10}
          onChange={(v) => setValue('monthlyEnergyKwh', v)}
          unit=" kWh"
        />
      </div>

      <div className="flex gap-3 mt-6">
        <Button type="button" variant="ghost" onClick={onBack} className="flex-1">← Back</Button>
        <Button type="submit" className="flex-1" size="lg">Continue →</Button>
      </div>
    </form>
  );
}

// ─── Step 4: Goals ────────────────────────────────────────────────────────────

function Step4Goals({ onComplete, onBack }: { onComplete: (data: any) => void; onBack: () => void }) {
  const { setValue, watch, handleSubmit } = useForm({
    resolver: zodResolver(OnboardingStep4Schema),
    defaultValues: { reductionPercent: 20, timeframeMonths: 12, selectedTemplates: [] },
  });

  const reductionPercent = watch('reductionPercent');
  const selectedTemplates = watch('selectedTemplates') as string[];

  const toggleTemplate = (id: string) => {
    const current = selectedTemplates;
    setValue(
      'selectedTemplates',
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id]
    );
  };

  return (
    <form onSubmit={handleSubmit(onComplete)} noValidate>
      <div className="mb-6">
        <div className="text-3xl mb-2" aria-hidden="true">🎯</div>
        <h2 className="font-display font-bold text-2xl text-eco-ink">Set your goal</h2>
        <p className="text-eco-slate text-sm mt-1">Choose reduction targets that feel achievable.</p>
      </div>

      <div className="space-y-6">
        <Slider
          id="reductionPercent"
          label="Reduction target"
          value={reductionPercent}
          min={5}
          max={80}
          step={5}
          onChange={(v) => setValue('reductionPercent', v)}
          unit="%"
        />

        <div>
          <p className="text-sm font-medium text-eco-ink mb-2">Quick-start goals (optional)</p>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            {GOAL_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => toggleTemplate(template.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  selectedTemplates.includes(template.id)
                    ? 'border-eco-leaf bg-eco-mist'
                    : 'border-gray-100 hover:border-eco-mint'
                }`}
                aria-pressed={selectedTemplates.includes(template.id)}
              >
                <span className="text-xl" aria-hidden="true">{template.icon}</span>
                <div>
                  <div className="text-sm font-medium text-eco-ink">{template.title}</div>
                  <div className="text-xs text-eco-slate">saves ~{template.targetReduction} kg CO₂e/month</div>
                </div>
                {selectedTemplates.includes(template.id) && (
                  <span className="ml-auto text-eco-leaf text-lg" aria-hidden="true">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button type="button" variant="ghost" onClick={onBack} className="flex-1">← Back</Button>
        <Button type="submit" className="flex-1" size="lg">
          🌱 Start tracking!
        </Button>
      </div>
    </form>
  );
}
