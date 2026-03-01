import { expect, test } from "@playwright/test";

const cards = [
  {
    id: 329865,
    mediaType: "movie",
    title: "Arrival",
    posterUrl: null,
    overview: "A linguist decodes alien messages.",
    rating: 7.9,
    genreIds: [18, 878],
    releaseDate: "2016-11-11",
    score: 0.91,
    explanation: ["Matches genres you liked"]
  },
  {
    id: 203744,
    mediaType: "tv",
    title: "Severance",
    posterUrl: null,
    overview: "Office workers split work and personal memories.",
    rating: 8.7,
    genreIds: [18, 9648],
    releaseDate: "2022-02-18",
    score: 0.9,
    explanation: ["Fresh pick based on your swipe vibe"]
  },
  {
    id: 447365,
    mediaType: "movie",
    title: "Guardians of the Galaxy Vol. 3",
    posterUrl: null,
    overview: "The team faces their past.",
    rating: 8.1,
    genreIds: [28, 35],
    releaseDate: "2023-05-05",
    score: 0.85,
    explanation: ["Strong community rating"]
  },
  {
    id: 100,
    mediaType: "movie",
    title: "Movie 4",
    posterUrl: null,
    overview: "",
    rating: 7,
    genreIds: [28],
    releaseDate: "2021-01-01",
    score: 0.8,
    explanation: ["Matches genres you liked"]
  },
  {
    id: 101,
    mediaType: "movie",
    title: "Movie 5",
    posterUrl: null,
    overview: "",
    rating: 7,
    genreIds: [28],
    releaseDate: "2021-01-01",
    score: 0.79,
    explanation: ["Matches genres you liked"]
  },
  {
    id: 102,
    mediaType: "movie",
    title: "Movie 6",
    posterUrl: null,
    overview: "",
    rating: 7,
    genreIds: [28],
    releaseDate: "2021-01-01",
    score: 0.78,
    explanation: ["Matches genres you liked"]
  },
  {
    id: 103,
    mediaType: "movie",
    title: "Movie 7",
    posterUrl: null,
    overview: "",
    rating: 7,
    genreIds: [28],
    releaseDate: "2021-01-01",
    score: 0.77,
    explanation: ["Matches genres you liked"]
  }
];

test("swipe right advances card and undo restores it", async ({ page }) => {
  const directions: string[] = [];

  await page.route("**/api/recommendations/next**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: cards, nextCursor: null, totalCandidates: cards.length })
    });
  });

  await page.route("**/api/swipes", async (route) => {
    const body = route.request().postDataJSON() as { direction: string };
    directions.push(body.direction);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, profileVersion: 2 })
    });
  });

  await page.route("**/api/swipes/undo", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, restored: true, profileVersion: 3 })
    });
  });

  await page.goto("/discover");

  await expect(page.getByRole("heading", { name: "Arrival" })).toBeVisible();
  await page.getByRole("button", { name: "Right: Seen, liked" }).click();
  await expect(page.getByRole("heading", { name: "Severance" })).toBeVisible();

  await page.getByRole("button", { name: "Undo Last Swipe" }).click();
  await expect(page.getByRole("heading", { name: "Arrival" })).toBeVisible();

  expect(directions).toEqual(["right"]);
});
