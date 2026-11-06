/**
 * api.js — Shinobi Database shared API module
 *
 * All communication with the Dattebayo API is centralised here.
 * UI code should never call fetch() directly.
 *
 * Live API base: https://dattebayo-api.onrender.com
 * Recon date: 2026-11-06
 *
 * Confirmed facts:
 *  - GET /{collection}?page=N&limit=M&name=X  → { <collection>, currentPage, pageSize, total }
 *  - GET /{collection}/{id}                   → single record (no envelope)
 *  - 404 for non-existent IDs
 *  - personal.affiliation / personal.team can be string OR array — normalised here
 *  - Clans, Teams, Villages have no image field
 *  - Character images is always an array (may be [])
 *  - No totalPages field — computed as Math.ceil(total / pageSize)
 */

export const API_BASE = 'https://dattebayo-api.onrender.com';
export const DEFAULT_LIMIT = 20;

/* ── Simple in-memory cache for single-record lookups ──────── */
const _cache = new Map();

function cacheKey(path) { return path; }

function getCached(key) { return _cache.get(key); }

function setCached(key, value) {
  // Keep cache bounded — evict oldest when over 200 entries
  if (_cache.size >= 200) {
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(key, value);
}

/* ── Core fetch utility ─────────────────────────────────────── */

/**
 * Fetch JSON from a URL, checking response.ok.
 * @param {string|URL} url
 * @param {AbortSignal} [signal]
 * @returns {Promise<any>}
 * @throws {ApiError}
 */
export async function fetchJson(url, signal) {
  let response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Network error — check your connection.', 0, err);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError('Record not found.', 404);
    }
    throw new ApiError(
      `API request failed (HTTP ${response.status}).`,
      response.status
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new ApiError('Received invalid data from the API.', response.status, err);
  }
  return data;
}

/** Structured error type so UI can distinguish API failures cleanly. */
export class ApiError extends Error {
  constructor(message, status = 0, cause = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.cause = cause;
  }
}

/* ── URL builder ────────────────────────────────────────────── */

/**
 * Build a URL for the API.
 * @param {string} path   e.g. '/characters'
 * @param {object} [params]  plain object of query params (skips null/undefined/'')
 * @returns {URL}
 */
export function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

/* ── Normalisers ────────────────────────────────────────────── */

/**
 * Ensure a value that the API may return as string or array is always an array.
 * Returns [] for null / undefined / empty string.
 */
export function toArray(value) {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Normalise a character record to guard against optional / inconsistent fields.
 * Does NOT remove any original fields — only adds safe defaults.
 */
function normaliseCharacter(char) {
  if (!char || typeof char !== 'object') return char;
  const p = char.personal || {};
  return {
    ...char,
    images: Array.isArray(char.images) ? char.images : [],
    personal: {
      ...p,
      affiliation: toArray(p.affiliation),
      team: toArray(p.team),
      clan: p.clan ?? null,
    },
  };
}

/* ── Characters ─────────────────────────────────────────────── */

/**
 * Fetch a page of characters.
 * @param {{ page?: number, limit?: number, name?: string }} opts
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ characters: object[], currentPage: number, pageSize: number, total: number, totalPages: number }>}
 */
export async function fetchCharacters({ page = 1, limit = DEFAULT_LIMIT, name = '' } = {}, signal) {
  const url = buildUrl('/characters', { page, limit, name });
  const data = await fetchJson(url, signal);
  const totalPages = Math.ceil(data.total / data.pageSize);
  return {
    ...data,
    characters: (data.characters || []).map(normaliseCharacter),
    totalPages,
  };
}

/**
 * Fetch a single character by numeric ID.
 * @param {number|string} id
 * @param {AbortSignal} [signal]
 * @returns {Promise<object>}
 */
export async function fetchCharacterById(id, signal) {
  const key = cacheKey(`/characters/${id}`);
  const cached = getCached(key);
  if (cached) return cached;

  const url = buildUrl(`/characters/${id}`);
  const data = await fetchJson(url, signal);
  const normalised = normaliseCharacter(data);
  setCached(key, normalised);
  return normalised;
}

/* ── Clans, Teams, Villages removed — project scope is Characters only ── */


