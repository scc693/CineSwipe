import {
  RECOMMENDATION_EXPLORE_RATIO,
  SAME_TYPE_EARLY_MULTIPLIER,
  SAME_TYPE_LATE_MULTIPLIER
} from "@/lib/constants";
import { MediaSummary, RecommendationCard, SwipeDirection, UserProfile } from "@/lib/types";

interface HistorySignal {
  direction: SwipeDirection;
  mediaType: "movie" | "tv";
  genreIds: number[];
}

interface RankInput {
  profile: UserProfile;
  candidates: MediaSummary[];
  history: HistorySignal[];
  preferredMediaType: "movie" | "tv" | null;
}

export function tokensFromMedia(media: Pick<MediaSummary, "genreIds" | "mediaType">): string[] {
  return [...media.genreIds.map((genreId) => `genre:${genreId}`), `type:${media.mediaType}`];
}

function bounded(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function sourceScore(media: MediaSummary): number {
  switch (media.source) {
    case "similar":
      return 1;
    case "recommendation":
      return 0.85;
    case "discover":
      return 0.65;
    default:
      return 0.55;
  }
}

function recencyScore(releaseDate: string | null): number {
  if (!releaseDate) return 0.4;
  const year = Number(releaseDate.slice(0, 4));
  if (!year || Number.isNaN(year)) return 0.4;
  const currentYear = new Date().getUTCFullYear();
  const age = Math.max(0, currentYear - year);
  return bounded(1 - age / 30);
}

function noveltyScore(media: MediaSummary): number {
  const popularity = media.popularity ?? 150;
  return bounded(1 - popularity / 1200, 0.1, 1);
}

function preferenceScore(media: MediaSummary, weights: Record<string, number>): number {
  const tokens = tokensFromMedia(media);
  const raw = tokens.reduce((sum, token) => sum + (weights[token] ?? 0), 0);
  // Logistic squeeze to [0,1] without hard clipping preference tails.
  return 1 / (1 + Math.exp(-raw / 8));
}

function deriveGenrePolarity(history: HistorySignal[]): {
  liked: Set<number>;
  disliked: Set<number>;
} {
  const liked = new Set<number>();
  const disliked = new Set<number>();

  for (const item of history) {
    if (item.direction === "right") {
      item.genreIds.forEach((genreId) => liked.add(genreId));
      continue;
    }
    if (item.direction === "left" || item.direction === "down") {
      item.genreIds.forEach((genreId) => disliked.add(genreId));
    }
  }

  return { liked, disliked };
}

function sameTypeBiasMultiplier(totalInteractions: number, isSameType: boolean): number {
  if (!isSameType) return 1;
  return totalInteractions < 20 ? SAME_TYPE_EARLY_MULTIPLIER : SAME_TYPE_LATE_MULTIPLIER;
}

function buildExplanation(media: MediaSummary, likedGenres: Set<number>, dislikedGenres: Set<number>): string[] {
  const explanation: string[] = [];

  const matchingLiked = media.genreIds.find((genreId) => likedGenres.has(genreId));
  if (matchingLiked) {
    explanation.push("Matches genres you liked");
  }

  const hasDisliked = media.genreIds.some((genreId) => dislikedGenres.has(genreId));
  if (!hasDisliked) {
    explanation.push("Avoids genres you usually skip");
  }

  if ((media.rating ?? 0) >= 7.2) {
    explanation.push("Strong community rating");
  }

  if (explanation.length === 0) {
    explanation.push("Fresh pick based on your swipe vibe");
  }

  return explanation.slice(0, 3);
}

export function rankRecommendations(input: RankInput): RecommendationCard[] {
  const { profile, candidates, history, preferredMediaType } = input;
  const genrePolarity = deriveGenrePolarity(history);

  const scored = candidates.map((candidate) => {
    const preference = preferenceScore(candidate, profile.featureWeights);
    const tmdbSimilarity = sourceScore(candidate);
    const quality = bounded((candidate.rating ?? 5) / 10);
    const novelty = noveltyScore(candidate);
    const recency = recencyScore(candidate.releaseDate);

    const baseScore =
      0.55 * preference +
      0.2 * tmdbSimilarity +
      0.1 * quality +
      0.1 * novelty +
      0.05 * recency;

    const multiplier = sameTypeBiasMultiplier(
      profile.totalInteractions,
      preferredMediaType !== null && preferredMediaType === candidate.mediaType
    );

    const score = baseScore * multiplier;

    return {
      ...candidate,
      score,
      explanation: buildExplanation(candidate, genrePolarity.liked, genrePolarity.disliked)
    };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);

  const exploreRatio = profile.exploreRatio || RECOMMENDATION_EXPLORE_RATIO;
  const exploreCount = Math.max(1, Math.floor(sorted.length * exploreRatio));
  const exploitCount = Math.max(0, sorted.length - exploreCount);

  const exploit = sorted.slice(0, exploitCount);
  const explore = sorted
    .slice(exploitCount)
    .sort((a, b) => noveltyScore(b) - noveltyScore(a) || b.score - a.score);

  const blended: RecommendationCard[] = [];
  let exploitIndex = 0;
  let exploreIndex = 0;
  let exploitSinceExplore = 0;

  while (exploitIndex < exploit.length || exploreIndex < explore.length) {
    const shouldTakeExplore =
      exploreIndex < explore.length &&
      (exploitSinceExplore >= 3 || exploitIndex >= exploit.length);

    if (shouldTakeExplore) {
      blended.push(explore[exploreIndex]);
      exploreIndex += 1;
      exploitSinceExplore = 0;
      continue;
    }

    if (exploitIndex < exploit.length) {
      blended.push(exploit[exploitIndex]);
      exploitIndex += 1;
      exploitSinceExplore += 1;
    }
  }

  return blended;
}

export function inferPreferredMediaType(history: HistorySignal[]): "movie" | "tv" | null {
  let movieScore = 0;
  let tvScore = 0;

  for (const signal of history) {
    const value = signal.direction === "right" ? 2 : signal.direction === "left" ? -1 : 0;
    if (signal.mediaType === "movie") {
      movieScore += value;
    } else {
      tvScore += value;
    }
  }

  if (movieScore === tvScore) return null;
  return movieScore > tvScore ? "movie" : "tv";
}
