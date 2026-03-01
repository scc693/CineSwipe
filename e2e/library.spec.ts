import { expect, test } from "@playwright/test";

interface Item {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterUrl: string | null;
  overview: string;
  rating: number | null;
  genreIds: number[];
  releaseDate: string | null;
  listType: "watchlist" | "rewatch";
  addedAt: string;
}

const baseItems: Item[] = [
  {
    id: 438631,
    mediaType: "movie",
    title: "Dune",
    posterUrl: null,
    overview: "House Atreides enters a planetary war.",
    rating: 8,
    genreIds: [878, 12],
    releaseDate: "2021-10-22",
    listType: "watchlist",
    addedAt: "2026-02-28T00:00:00.000Z"
  },
  {
    id: 1429,
    mediaType: "tv",
    title: "The Bear",
    posterUrl: null,
    overview: "A chef returns to run his family sandwich shop.",
    rating: 8.6,
    genreIds: [18],
    releaseDate: "2022-06-23",
    listType: "watchlist",
    addedAt: "2026-02-27T00:00:00.000Z"
  },
  {
    id: 949,
    mediaType: "movie",
    title: "Heat",
    posterUrl: null,
    overview: "A career criminal and detective collide.",
    rating: 8.2,
    genreIds: [80, 53],
    releaseDate: "1995-12-15",
    listType: "rewatch",
    addedAt: "2026-02-26T00:00:00.000Z"
  }
];

function filterItems(url: string): Item[] {
  const parsed = new URL(url);
  const listType = (parsed.searchParams.get("listType") ?? "watchlist") as "watchlist" | "rewatch";
  const mediaType = (parsed.searchParams.get("mediaType") ?? "all") as "all" | "movie" | "tv";
  const genreParam = parsed.searchParams.get("genre");
  const genre = genreParam ? Number(genreParam) : null;

  return baseItems.filter((item) => {
    if (item.listType !== listType) return false;
    if (mediaType !== "all" && item.mediaType !== mediaType) return false;
    if (genre !== null && !item.genreIds.includes(genre)) return false;
    return true;
  });
}

test("library filters by list and media type", async ({ page }) => {
  await page.route("**/api/library**", async (route) => {
    const items = filterItems(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items })
    });
  });

  await page.goto("/library");

  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(page.getByText("Dune")).toBeVisible();
  await expect(page.getByText("The Bear")).toBeVisible();

  await page.getByRole("button", { name: "Rewatch" }).click();
  await expect(page.getByText("Heat")).toBeVisible();
  await expect(page.getByText("Dune")).not.toBeVisible();

  await page.getByRole("button", { name: "TV Shows" }).click();
  await expect(page.getByText("No TV shows in this view.")).toBeVisible();
});
