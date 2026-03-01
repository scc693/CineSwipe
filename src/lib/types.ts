export type MediaType = "movie" | "tv";
export type SwipeDirection = "left" | "right" | "up" | "down";
export type ListType = "watchlist" | "rewatch";

export interface MediaSummary {
  id: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
  overview: string;
  rating: number | null;
  genreIds: number[];
  releaseDate: string | null;
  popularity?: number;
  source?: "similar" | "recommendation" | "discover" | "trending";
}

export interface RecommendationCard extends MediaSummary {
  score: number;
  explanation: string[];
}

export interface SeedItem {
  mediaId: number;
  mediaType: MediaType;
  title: string;
  genreIds: number[];
}

export interface SwipeEventInput {
  mediaId: number;
  mediaType: MediaType;
  direction: SwipeDirection;
  media: MediaSummary;
}

export interface SwipeEvent extends SwipeEventInput {
  id: string;
  userId: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  featureWeights: Record<string, number>;
  totalInteractions: number;
  exploreRatio: number;
  profileVersion: number;
  updatedAt: string;
}

export interface LibraryItem extends MediaSummary {
  listType: ListType;
  addedAt: string;
}

export interface LibraryQuery {
  listType: ListType;
  mediaType: "all" | MediaType;
  genre?: number;
  sort: "recent";
}

export interface ScoreContext {
  profile: UserProfile;
  likeGenres: Set<number>;
  dislikeGenres: Set<number>;
  sameTypeBias: number;
}
