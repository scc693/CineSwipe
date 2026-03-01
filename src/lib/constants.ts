import { SwipeDirection } from "@/lib/types";

export const TMDB_BASE_URL = process.env.TMDB_BASE_URL ?? "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE_URL =
  process.env.TMDB_IMAGE_BASE_URL ?? "https://image.tmdb.org/t/p/w500";

export const RECOMMENDATION_EXPLORE_RATIO = clampRatio(
  Number(process.env.RECOMMENDATION_EXPLORE_RATIO ?? "0.25")
);
export const TMDB_CACHE_TTL_HOURS = Number(process.env.TMDB_CACHE_TTL_HOURS ?? "72");
export const DOWN_SWIPE_HIDE_DAYS = Number(process.env.DOWN_SWIPE_HIDE_DAYS ?? "90");

export const SWIPE_PROFILE_DELTAS: Record<SwipeDirection, number> = {
  left: -3,
  right: 3,
  up: 1,
  down: -4
};

export const SEEN_POSITIVE_WEIGHT = 2;
export const SAME_TYPE_EARLY_MULTIPLIER = 1.15;
export const SAME_TYPE_LATE_MULTIPLIER = 1.05;

export const MAX_SEEDS = 5;
export const MIN_SEEDS = 1;

export const CARD_BATCH_SIZE = 20;

function clampRatio(value: number): number {
  if (Number.isNaN(value)) return 0.25;
  return Math.min(0.95, Math.max(0.05, value));
}
