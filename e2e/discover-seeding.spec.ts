import { expect, test } from "@playwright/test";

const seedSearchResult = {
  id: 27205,
  mediaType: "movie",
  title: "Inception",
  posterUrl: null,
  overview: "A skilled thief enters dreams.",
  rating: 8.4,
  genreIds: [28, 878],
  releaseDate: "2010-07-16"
};

const recommendationCard = {
  id: 335984,
  mediaType: "movie",
  title: "Blade Runner 2049",
  posterUrl: null,
  overview: "A new blade runner uncovers a secret.",
  rating: 8,
  genreIds: [878, 53],
  releaseDate: "2017-10-06",
  score: 0.95,
  explanation: ["Matches genres you liked", "Strong community rating"]
};

test("requires a seed then starts discovery", async ({ page }) => {
  let seeded = false;

  await page.route("**/api/recommendations/next**", async (route) => {
    if (!seeded) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ requiresSeed: true, items: [], nextCursor: null })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [recommendationCard],
        nextCursor: null,
        totalCandidates: 1
      })
    });
  });

  await page.route("**/api/search", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results: [seedSearchResult] })
    });
  });

  await page.route("**/api/seeds", async (route) => {
    seeded = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, profileVersion: 1 })
    });
  });

  await page.goto("/discover");

  await expect(page.getByRole("heading", { name: "Seed Your Taste Profile" })).toBeVisible();
  await page.getByPlaceholder("Search a movie or show you've seen").fill("Inception");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.getByText("Inception")).toBeVisible();
  await page.getByRole("button", { name: "Add" }).first().click();
  await page.getByRole("button", { name: "Start Discovery" }).click();

  await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Blade Runner 2049" })).toBeVisible();
});
