import { z } from "zod";

const mediaTypeSchema = z.enum(["movie", "tv"]);

export const searchRequestSchema = z.object({
  query: z.string().min(1).max(120),
  page: z.number().int().min(1).max(5).optional()
});

export const seedItemSchema = z.object({
  mediaId: z.number().int().positive(),
  mediaType: mediaTypeSchema,
  title: z.string().min(1).max(200),
  genreIds: z.array(z.number().int()).default([])
});

export const seedsRequestSchema = z.object({
  items: z.array(seedItemSchema).min(1).max(5)
});

export const mediaSummarySchema = z.object({
  id: z.number().int().positive(),
  mediaType: mediaTypeSchema,
  title: z.string().min(1).max(200),
  posterUrl: z.string().url().nullable(),
  overview: z.string().max(5000),
  rating: z.number().min(0).max(10).nullable(),
  genreIds: z.array(z.number().int()),
  releaseDate: z.string().nullable(),
  popularity: z.number().optional(),
  source: z.enum(["similar", "recommendation", "discover", "trending"]).optional()
});

export const swipeRequestSchema = z.object({
  mediaId: z.number().int().positive(),
  mediaType: mediaTypeSchema,
  direction: z.enum(["left", "right", "up", "down"]),
  media: mediaSummarySchema
});

export const recommendationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export const libraryQuerySchema = z.object({
  listType: z.enum(["watchlist", "rewatch"]).default("watchlist"),
  mediaType: z.enum(["all", "movie", "tv"]).default("all"),
  genre: z.coerce.number().int().optional(),
  sort: z.enum(["recent"]).default("recent")
});
