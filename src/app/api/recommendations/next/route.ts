import { NextRequest } from "next/server";
import { CARD_BATCH_SIZE } from "@/lib/constants";
import { requireAuthUser } from "@/lib/auth-server";
import {
  getHiddenMediaKeys,
  getOrCreateProfile,
  getRecentSignals,
  getSeeds,
  getSeenOrSwipedMediaKeys
} from "@/lib/firestore";
import { fromError, ok } from "@/lib/http";
import { mediaKey } from "@/lib/media";
import { inferPreferredMediaType, rankRecommendations } from "@/lib/recommendations";
import { discoverByGenres, similarForSeed, trendingMixed } from "@/lib/tmdb";
import { recommendationsQuerySchema } from "@/lib/validators";
import { MediaSummary } from "@/lib/types";

function topGenres(
  signals: Array<{ direction: "left" | "right" | "up" | "down"; genreIds: number[] }>,
  limit = 3
): number[] {
  const score = new Map<number, number>();

  for (const signal of signals) {
    const delta = signal.direction === "right" ? 2 : signal.direction === "left" || signal.direction === "down" ? -2 : 1;
    for (const genreId of signal.genreIds) {
      score.set(genreId, (score.get(genreId) ?? 0) + delta);
    }
  }

  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter((entry) => entry[1] > 0)
    .slice(0, limit)
    .map((entry) => entry[0]);
}

function dedupe(items: MediaSummary[]): MediaSummary[] {
  const seen = new Set<string>();
  const results: MediaSummary[] = [];

  for (const item of items) {
    const key = mediaKey(item.mediaType, item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }

  return results;
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthUser(request);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsedQuery = recommendationsQuerySchema.parse(params);
    const limit = parsedQuery.limit ?? CARD_BATCH_SIZE;
    const offset = Number(parsedQuery.cursor ?? "0");

    const [profile, seeds, history, hiddenKeys, swipedKeys] = await Promise.all([
      getOrCreateProfile(uid),
      getSeeds(uid),
      getRecentSignals(uid),
      getHiddenMediaKeys(uid),
      getSeenOrSwipedMediaKeys(uid)
    ]);

    if (seeds.length === 0) {
      return ok({ requiresSeed: true, items: [], nextCursor: null });
    }

    const bySeedPromises = seeds.slice(0, 5).map((seed) => similarForSeed(seed.mediaType, seed.mediaId));
    const seedResults = await Promise.all(bySeedPromises);

    const preferredGenres = topGenres(history);

    const [genreMovies, genreShows, trending] = await Promise.all([
      discoverByGenres("movie", preferredGenres, 1),
      discoverByGenres("tv", preferredGenres, 1),
      trendingMixed(1)
    ]);

    const combined = dedupe([...seedResults.flat(), ...genreMovies, ...genreShows, ...trending]);

    const filtered = combined.filter((item) => {
      const key = mediaKey(item.mediaType, item.id);
      return !hiddenKeys.has(key) && !swipedKeys.has(key);
    });

    const preferredMediaType = inferPreferredMediaType(history);
    const ranked = rankRecommendations({
      profile,
      candidates: filtered,
      history,
      preferredMediaType
    });

    const paged = ranked.slice(offset, offset + limit);
    const nextCursor = offset + limit < ranked.length ? String(offset + limit) : null;

    return ok({ items: paged, nextCursor, totalCandidates: ranked.length });
  } catch (error) {
    return fromError(error);
  }
}
