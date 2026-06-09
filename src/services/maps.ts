// Google Maps Distance Service
// Dynamically loaded to avoid adding to initial bundle

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let isLoaded = false;
let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (isLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser context'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      isLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export interface RouteResult {
  distanceKm: number;
  distanceMiles: number;
  duration: string;
  origin: string;
  destination: string;
}

/**
 * Calculate distance between two locations using Google Distance Matrix API.
 */
export async function calculateRouteDistance(
  origin: string,
  destination: string,
  travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
): Promise<RouteResult> {
  await loadGoogleMaps();

  return new Promise((resolve, reject) => {
    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [destination],
        travelMode,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (
          status !== google.maps.DistanceMatrixStatus.OK ||
          !response ||
          !response.rows[0].elements[0]
        ) {
          reject(new Error(`Distance calculation failed: ${status}`));
          return;
        }

        const element = response.rows[0].elements[0];

        if (element.status !== 'OK') {
          reject(new Error(`Route not found between ${origin} and ${destination}`));
          return;
        }

        const meters = element.distance.value;
        const distanceKm = meters / 1000;
        const distanceMiles = distanceKm * 0.621371;

        resolve({
          distanceKm: Math.round(distanceKm * 10) / 10,
          distanceMiles: Math.round(distanceMiles * 10) / 10,
          duration: element.duration.text,
          origin: response.originAddresses[0],
          destination: response.destinationAddresses[0],
        });
      }
    );
  });
}

/**
 * Get autocomplete suggestions for a location input.
 */
export async function getPlaceSuggestions(
  input: string,
  sessionToken?: google.maps.places.AutocompleteSessionToken
): Promise<google.maps.places.AutocompletePrediction[]> {
  await loadGoogleMaps();

  return new Promise((resolve, reject) => {
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions(
      { input, sessionToken },
      (predictions, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
          resolve([]);
          return;
        }
        resolve(predictions ?? []);
      }
    );
  });
}

/**
 * Initialize a Google Maps instance on a div element.
 */
export async function initMap(
  container: HTMLDivElement,
  center = { lat: 51.5074, lng: -0.1278 },
  zoom = 10
): Promise<google.maps.Map> {
  await loadGoogleMaps();
  return new google.maps.Map(container, { center, zoom });
}

/**
 * Draw a route on a map between two points.
 */
export async function renderRouteOnMap(
  map: google.maps.Map,
  origin: string,
  destination: string
): Promise<void> {
  await loadGoogleMaps();

  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  const result = await directionsService.route({
    origin,
    destination,
    travelMode: google.maps.TravelMode.DRIVING,
  });

  directionsRenderer.setDirections(result);
}
