/**
 * Weather & Air Quality Service
 * Fetches real-time weather + AQI data from OpenWeatherMap API.
 *
 * Required env vars:
 *   OPENWEATHER_API_KEY  — free key from https://openweathermap.org/appid
 *   SITE_LATITUDE        — default latitude (e.g. 25.2048)
 *   SITE_LONGITUDE       — default longitude (e.g. 55.2708)
 *
 * Free tier gives:
 *   • Current Weather  — /data/2.5/weather  (no limit)
 *   • Air Pollution    — /data/2.5/air_pollution  (no limit)
 */

export interface WeatherAPIResponse {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  condition: string;
  uvIndex: number;
  precipitation: number;
  aqi: number;
  aqiComponents: {
    co: number;
    no2: number;
    o3: number;
    pm2_5: number;
    pm10: number;
    so2: number;
  };
  location: string;
  updatedAt: string;
}

const WIND_DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const degreesToDirection = (deg: number): string => WIND_DIRS[Math.round(deg / 22.5) % 16];

/**
 * Convert OpenWeatherMap AQI (1-5 scale) to US EPA AQI (0-500 scale)
 * using PM2.5 as primary pollutant.
 */
const convertToUSAQI = (owmAqi: number, pm25: number): number => {
  // If we have PM2.5 data, use EPA breakpoints
  if (pm25 != null) {
    if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
    if (pm25 <= 35.4) return Math.round(50 + ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1));
    if (pm25 <= 55.4) return Math.round(100 + ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5));
    if (pm25 <= 150.4) return Math.round(150 + ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5));
    if (pm25 <= 250.4) return Math.round(200 + ((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5));
    return Math.round(300 + ((500 - 301) / (500.4 - 250.5)) * (pm25 - 250.5));
  }
  // Fallback: map OWM 1-5 to approximate AQI ranges
  const approx: Record<number, number> = { 1: 25, 2: 75, 3: 125, 4: 175, 5: 300 };
  return approx[owmAqi] ?? 50;
};

// In-memory cache keyed by rounded lat/lng (5 min TTL) to avoid hammering the API
const cacheMap = new Map<string, { data: WeatherAPIResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function cacheKey(lat: number, lng: number): string {
  // Round to 2 decimals (~1 km precision) so nearby requests share cache
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export async function fetchWeatherAndAQI(lat?: number, lng?: number): Promise<WeatherAPIResponse> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const latitude = lat ?? parseFloat(process.env.SITE_LATITUDE || '25.2048');
  const longitude = lng ?? parseFloat(process.env.SITE_LONGITUDE || '55.2708');
  const key = cacheKey(latitude, longitude);

  // Return cache if fresh for this location
  const cached = cacheMap.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  if (!apiKey) {
    throw new Error('OPENWEATHER_API_KEY not configured — cannot fetch real weather data');
  }

  try {
    // Fetch weather + air pollution in parallel
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`),
      fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${apiKey}`),
    ]);

    if (!weatherRes.ok) throw new Error(`Weather API ${weatherRes.status}: ${await weatherRes.text()}`);
    if (!aqiRes.ok) throw new Error(`AQI API ${aqiRes.status}: ${await aqiRes.text()}`);

    const weather = await weatherRes.json();
    const aqi = await aqiRes.json();

    const aqiData = aqi?.list?.[0];
    const components = aqiData?.components || {};
    const owmAqi = aqiData?.main?.aqi ?? 1;

    const result: WeatherAPIResponse = {
      temperature: Math.round(weather.main.temp),
      feelsLike: Math.round(weather.main.feels_like),
      humidity: weather.main.humidity,
      pressure: weather.main.pressure,
      windSpeed: Math.round(weather.wind.speed * 3.6), // m/s → km/h
      windDirection: degreesToDirection(weather.wind.deg || 0),
      visibility: Math.round((weather.visibility || 10000) / 1000), // m → km
      condition: weather.weather?.[0]?.main || 'Clear',
      uvIndex: 0, // UV not available on free tier — will use 0 as placeholder
      precipitation: weather.rain?.['1h'] ? Math.min(100, Math.round(weather.rain['1h'] * 10)) : (weather.clouds?.all > 70 ? 30 : 0),
      aqi: convertToUSAQI(owmAqi, components.pm2_5),
      aqiComponents: {
        co: components.co ?? 0,
        no2: components.no2 ?? 0,
        o3: components.o3 ?? 0,
        pm2_5: components.pm2_5 ?? 0,
        pm10: components.pm10 ?? 0,
        so2: components.so2 ?? 0,
      },
      location: weather.name || 'Site',
      updatedAt: new Date().toISOString(),
    };

    // Try fetching UV index from One (Call 3.0 free endpoint isn't available; skip if fails)
    try {
      const uvRes = await fetch(`https://api.openweathermap.org/data/2.5/uvi?lat=${latitude}&lon=${longitude}&appid=${apiKey}`);
      if (uvRes.ok) {
        const uvData = await uvRes.json();
        result.uvIndex = Math.round(uvData.value ?? 0);
      }
    } catch { /* UV not critical */ }

    cacheMap.set(key, { data: result, timestamp: Date.now() });
    console.log(`[Weather] Fetched live data for ${result.location} — AQI ${result.aqi}, ${result.temperature}°C`);
    return result;

  } catch (err: any) {
    console.error('[Weather] API fetch failed:', err.message);
    throw err;
  }
}

/** Clear the cache (e.g., when user changes site location) */
export function clearWeatherCache() {
  cacheMap.clear();
}
