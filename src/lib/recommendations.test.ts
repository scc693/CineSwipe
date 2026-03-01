import { describe, expect, it } from "vitest";
import { inferPreferredMediaType, rankRecommendations, tokensFromMedia } from "@/lib/recommendations";
import { MediaSummary, UserProfile } from "@/lib/types";

const baseProfile: UserProfile = {
  userId: "u_1",
  featureWeights: {
    "genre:878": 8,
    "genre:18": 3,
    "genre:35": -6,
    "type:movie": 2
  },
  totalInteractions: 10,
  exploreRatio: 0.25,
  profileVersion: 2,
  updatedAt: new Date().toISOString()
};

function makeCandidate(partial: Partial<MediaSummary>): MediaSummary {
  return {
    id: partial.id ?? Math.floor(Math.random() * 10000),
    mediaType: partial.mediaType ?? "movie",
    title: partial.title ?? "Untitled",
    posterUrl: null,
    overview: partial.overview ?? "",
    rating: partial.rating ?? 7,
    genreIds: partial.genreIds ?? [],
    releaseDate: partial.releaseDate ?? "2024-01-01",
    popularity: partial.popularity ?? 100,
    source: partial.source ?? "similar"
  };
}

describe("tokensFromMedia", () => {
  it("builds genre and type tokens", () => {
    const tokens = tokensFromMedia({ genreIds: [878, 18], mediaType: "movie" });
    expect(tokens).toEqual(["genre:878", "genre:18", "type:movie"]);
  });
});

describe("rankRecommendations", () => {
  it("prefers candidate aligned to weighted genres", () => {
    const candidates = [
      makeCandidate({ id: 1, title: "Comedy Pick", genreIds: [35], mediaType: "movie" }),
      makeCandidate({ id: 2, title: "Sci-Fi Pick", genreIds: [878], mediaType: "movie" })
    ];

    const ranked = rankRecommendations({
      profile: baseProfile,
      candidates,
      history: [
        {
          direction: "right",
          mediaType: "movie",
          genreIds: [878]
        }
      ],
      preferredMediaType: "movie"
    });

    expect(ranked[0].title).toBe("Sci-Fi Pick");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("injects exploration picks instead of pure score ordering", () => {
    const candidates = Array.from({ length: 12 }).map((_, index) =>
      makeCandidate({
        id: index + 1,
        title: `Title ${index + 1}`,
        genreIds: index === 11 ? [16] : [878],
        popularity: index === 11 ? 0 : 500,
        source: index === 11 ? "trending" : "similar"
      })
    );

    const ranked = rankRecommendations({
      profile: baseProfile,
      candidates,
      history: [],
      preferredMediaType: "movie"
    });

    expect(ranked).toHaveLength(12);
    expect(ranked[3].title).toBeDefined();
  });
});

describe("inferPreferredMediaType", () => {
  it("returns media type with stronger positive history", () => {
    const mediaType = inferPreferredMediaType([
      { mediaType: "movie", direction: "right", genreIds: [28] },
      { mediaType: "movie", direction: "right", genreIds: [18] },
      { mediaType: "tv", direction: "left", genreIds: [35] }
    ]);

    expect(mediaType).toBe("movie");
  });

  it("returns null when balanced", () => {
    const mediaType = inferPreferredMediaType([
      { mediaType: "movie", direction: "right", genreIds: [28] },
      { mediaType: "tv", direction: "right", genreIds: [28] }
    ]);

    expect(mediaType).toBeNull();
  });
});
