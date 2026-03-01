import { TMDB_BASE_URL, TMDB_CACHE_TTL_HOURS, TMDB_IMAGE_BASE_URL } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import { MediaSummary, MediaType } from "@/lib/types";

interface TmdbResult {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
}

interface TmdbListResponse {
  results: TmdbResult[];
}

function assertTmdbKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB_API_KEY is missing");
  }
  return key;
}

function normalizeMedia(result: TmdbResult, fallbackType?: MediaType): MediaSummary | null {
  const mediaType = (result.media_type as MediaType | undefined) ?? fallbackType;
  if (mediaType !== "movie" && mediaType !== "tv") {
    return null;
  }

  return {
    id: result.id,
    mediaType,
    title: result.title ?? result.name ?? "Untitled",
    posterUrl: result.poster_path ? `${TMDB_IMAGE_BASE_URL}${result.poster_path}` : null,
    overview: result.overview ?? "",
    rating: result.vote_average ?? null,
    genreIds: result.genre_ids ?? [],
    releaseDate: result.release_date ?? result.first_air_date ?? null,
    popularity: result.popularity ?? 0
  };
}

async function getCached<T>(cacheKey: string): Promise<T | null> {
  const db = getAdminDb();
  const doc = await db.collection("tmdb_cache").doc(cacheKey).get();
  if (!doc.exists) return null;

  const data = doc.data();
  if (!data) return null;

  const expiresAt = data.expiresAt?.toDate?.();
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    return null;
  }

  return data.payload as T;
}

async function setCached<T>(cacheKey: string, payload: T) {
  const db = getAdminDb();
  const expiresAt = new Date(Date.now() + TMDB_CACHE_TTL_HOURS * 60 * 60 * 1000);
  await db.collection("tmdb_cache").doc(cacheKey).set(
    {
      payload,
      expiresAt,
      updatedAt: new Date()
    },
    { merge: true }
  );
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  query.set("api_key", assertTmdbKey());

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    query.set(key, String(value));
  }

  return query.toString();
}

function cacheKey(path: string, params: Record<string, string | number | boolean | undefined>): string {
  const sorted = Object.entries(params)
    .filter((entry) => entry[1] !== undefined)
    .sort((a, b) => a[0].localeCompare(b[0]));
  return `${path}?${sorted.map(([k, v]) => `${k}=${String(v)}`).join("&")}`;
}

async function tmdbGet<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<T> {
  const key = cacheKey(path, params);
  const cached = await getCached<T>(key);
  if (cached) return cached;

  const response = await fetch(`${TMDB_BASE_URL}${path}?${buildQuery(params)}`, {
    headers: {
      accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status}): ${path}`);
  }

  const payload = (await response.json()) as T;
  await setCached<T>(key, payload);
  return payload;
}

export async function searchMulti(query: string, page = 1): Promise<MediaSummary[]> {
  const response = await tmdbGet<TmdbListResponse>("/search/multi", {
    query,
    page,
    include_adult: false,
    language: "en-US"
  });

  return response.results
    .map((result) => normalizeMedia(result))
    .filter((item): item is MediaSummary => item !== null)
    .slice(0, 20);
}

export async function similarForSeed(seedType: MediaType, seedId: number): Promise<MediaSummary[]> {
  const [similar, recommended] = await Promise.all([
    tmdbGet<TmdbListResponse>(`/${seedType}/${seedId}/similar`, {
      page: 1,
      language: "en-US"
    }),
    tmdbGet<TmdbListResponse>(`/${seedType}/${seedId}/recommendations`, {
      page: 1,
      language: "en-US"
    })
  ]);

  const similarItems = similar.results
    .map((item) => normalizeMedia(item, seedType))
    .filter((item): item is MediaSummary => item !== null)
    .map((item) => ({ ...item, source: "similar" as const }));

  const recommendationItems = recommended.results
    .map((item) => normalizeMedia(item, seedType))
    .filter((item): item is MediaSummary => item !== null)
    .map((item) => ({ ...item, source: "recommendation" as const }));

  return [...similarItems, ...recommendationItems];
}

export async function discoverByGenres(
  mediaType: MediaType,
  genres: number[],
  page = 1
): Promise<MediaSummary[]> {
  if (genres.length === 0) {
    return [];
  }

  const response = await tmdbGet<TmdbListResponse>(`/discover/${mediaType}`, {
    with_genres: genres.join(","),
    sort_by: "popularity.desc",
    page,
    include_adult: false,
    language: "en-US"
  });

  return response.results
    .map((item) => normalizeMedia(item, mediaType))
    .filter((item): item is MediaSummary => item !== null)
    .map((item) => ({ ...item, source: "discover" as const }));
}

export async function trendingMixed(page = 1): Promise<MediaSummary[]> {
  const response = await tmdbGet<TmdbListResponse>("/trending/all/week", {
    page,
    language: "en-US"
  });

  return response.results
    .map((item) => normalizeMedia(item))
    .filter((item): item is MediaSummary => item !== null)
    .map((item) => ({ ...item, source: "trending" as const }));
}
