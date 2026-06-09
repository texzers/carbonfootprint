import React, { useState, useRef, useCallback, useEffect } from 'react';
import { loadGoogleMaps, calculateRouteDistance } from '../../services/maps';
import { Button, Input, Card, FormField, LoadingSpinner } from '../shared';

interface MapDistanceModalProps {
  onClose: () => void;
  onDistanceSelected: (km: number) => void;
}

export function MapDistanceModal({ onClose, onDistanceSelected }: MapDistanceModalProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ distanceKm: number; duration: string; origin: string; destination: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load Maps API
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(() => setError('Google Maps failed to load. Check your API key.'));
  }, []);

  // Focus trap
  useEffect(() => {
    const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
      'button, input, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleCalculate = async () => {
    if (!origin.trim() || !destination.trim()) {
      setError('Please enter both origin and destination.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await calculateRouteDistance(origin, destination);
      setResult(r);
    } catch (err: any) {
      setError(err.message ?? 'Could not calculate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDistance = () => {
    if (result) onDistanceSelected(result.distanceKm);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Calculate route distance with Google Maps"
    >
      <div ref={modalRef} className="bg-white rounded-2xl shadow-elevated w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">📍</span>
            <h2 className="font-display font-bold text-lg text-eco-ink">Calculate route distance</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-eco-slate hover:bg-eco-mist transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eco-leaf"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <FormField label="Origin" htmlFor="map-origin" hint="e.g. 10 Downing Street, London">
            <Input
              id="map-origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Start location"
              onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
            />
          </FormField>

          <FormField label="Destination" htmlFor="map-destination" hint="e.g. Manchester Piccadilly">
            <Input
              id="map-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="End location"
              onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
            />
          </FormField>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3" role="alert">
              {error}
            </p>
          )}

          <Button
            onClick={handleCalculate}
            loading={loading}
            disabled={!mapsReady || !origin || !destination}
            fullWidth
          >
            {loading ? 'Calculating…' : '🗺️ Calculate distance'}
          </Button>

          {!mapsReady && !error && (
            <div className="flex items-center gap-2 text-eco-slate text-sm justify-center">
              <LoadingSpinner size={16} />
              Loading Google Maps…
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="p-4 bg-eco-mist rounded-xl border border-eco-mint/30">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs text-eco-slate font-medium uppercase tracking-wide mb-1">Route found</p>
                  <p className="text-sm text-eco-ink">
                    {result.origin} → {result.destination}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="font-mono font-bold text-2xl text-eco-forest">{result.distanceKm.toFixed(1)}</p>
                  <p className="text-xs text-eco-slate mt-0.5">kilometres</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="font-mono font-bold text-2xl text-eco-leaf">{result.duration}</p>
                  <p className="text-xs text-eco-slate mt-0.5">drive time</p>
                </div>
              </div>
              <Button onClick={handleUseDistance} fullWidth className="mt-3">
                Use this distance ({result.distanceKm.toFixed(1)} km)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
