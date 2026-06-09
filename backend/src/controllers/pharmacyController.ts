import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

interface PharmacyQuery {
  lat?: string;
  lng?: string;
  keyword?: string;
}

interface GooglePlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: { lat: number; lng: number };
  };
}

interface CleanPharmacy {
  id: string;
  name: string;
  vicinity: string;
  latitude: number;
  longitude: number;
}

type CacheEntry = {
  expiresAt: number;
  value: CleanPharmacy[];
};

const cache = new Map<string, CacheEntry>();

function getCacheTtlMs(): number {
  const raw = process.env.PHARMACY_CACHE_TTL_MS;
  const parsed = raw ? Number(raw) : 24 * 60 * 60 * 1000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24 * 60 * 60 * 1000;
}

function getCacheMaxEntries(): number {
  const raw = process.env.PHARMACY_CACHE_MAX;
  const parsed = raw ? Number(raw) : 500;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 500;
}

function cacheGet(key: string): CleanPharmacy[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  // refresh LRU order (insertion order)
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function cacheSet(key: string, value: CleanPharmacy[]) {
  const ttlMs = getCacheTtlMs();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });

  const max = getCacheMaxEntries();
  while (cache.size > max) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(err: unknown): boolean {
  const ax = err as AxiosError | undefined;
  const status = ax?.response?.status;
  if (!status) return true; // network / timeout
  return status === 429 || (status >= 500 && status <= 599);
}

async function axiosGetWithRetry<T>(url: string, attempts: number, timeoutMs: number): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await axios.get<T>(url, { timeout: timeoutMs });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !shouldRetry(err)) break;
      await sleep(250 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

export const getNearbyPharmacies = async (
  req: Request<{}, {}, {}, PharmacyQuery>,
  res: Response
) => {
  const { lat, lng, keyword } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude e Longitude são obrigatórios.' });
  }

  const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY_PLACES;
  if (!GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Chave da API não configurada no servidor.' });
  }

  // Round to ~1km granularity to increase cache hits.
  const cacheKey = `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}_${keyword || ''}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return res.json({ status: 'OK', results: cached, cached: true });
  }

  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lng}` +
    `&radius=1500` +
    `&type=pharmacy` +
    `&keyword=${encodeURIComponent(keyword || '')}` +
    `&key=${GOOGLE_API_KEY}`;

  const timeoutMs = process.env.GOOGLE_PLACES_TIMEOUT_MS
    ? Number(process.env.GOOGLE_PLACES_TIMEOUT_MS)
    : 5000;

  try {
    const data = await axiosGetWithRetry<{ status: string; results: GooglePlaceResult[]; error_message?: string }>(
      url,
      3,
      Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000
    );

    if (data.status === 'ZERO_RESULTS') {
      cacheSet(cacheKey, []);
      return res.json({ status: 'OK', results: [] });
    }

    if (data.status !== 'OK' || !Array.isArray(data.results)) {
      return res.status(502).json({
        error: 'Erro ao buscar farmácias.',
        providerStatus: data.status,
        providerMessage: data.error_message,
      });
    }

    const clean: CleanPharmacy[] = data.results.map((p) => ({
      id: p.place_id,
      name: p.name,
      vicinity: p.vicinity,
      latitude: p.geometry.location.lat,
      longitude: p.geometry.location.lng,
    }));

    cacheSet(cacheKey, clean);
    return res.json({ status: 'OK', results: clean });
  } catch (error: any) {
    const ax = error as AxiosError | undefined;
    const status = ax?.response?.status;
    const code = (error as any)?.code;
    console.error('Erro ao buscar no Google Places:', { status, code });
    return res.status(502).json({ error: 'Erro ao buscar farmácias.' });
  }
};

