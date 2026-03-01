# CineSwipe

CineSwipe is a responsive web app for finding new movies and shows with fast directional swipes:

- `Left`: Seen and disliked
- `Right`: Seen and liked
- `Up`: Save (unseen -> Watchlist, seen -> Rewatch)
- `Down`: Not interested (hidden for 90 days)

The app seeds recommendations from at least one known title, then continuously adapts ranking using your interactions.

## Stack

- Next.js (App Router) + TypeScript
- Firebase Auth (Google) + Cloud Firestore
- TMDB API for search, posters, ratings, summaries, and similarity candidates
- Vitest for recommendation logic tests

## Prerequisites

- Node.js 20+
- Firebase project with:
  - Google sign-in enabled in Auth
  - Cloud Firestore enabled
- TMDB API key

## Environment Variables

1. Copy the template:

```bash
cp .env.example .env.local
```

2. Fill all values in `.env.local`.

Important:

- `FIREBASE_PRIVATE_KEY` must keep escaped newlines (`\\n`) if pasted on one line.
- `TMDB_API_KEY` is server-only and must not be exposed in client code.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API Endpoints

- `POST /api/search`
- `POST /api/seeds`
- `GET /api/recommendations/next`
- `POST /api/swipes`
- `POST /api/swipes/undo`
- `GET /api/library`

All endpoints require a Firebase ID token in `Authorization: Bearer <token>`.

## Data Model (Firestore)

- `users/{uid}/profile/main`
- `users/{uid}/seeds/{mediaKey}`
- `users/{uid}/interactions/{interactionId}`
- `users/{uid}/lists/watchlist/items/{mediaKey}`
- `users/{uid}/lists/rewatch/items/{mediaKey}`
- `users/{uid}/hidden/{mediaKey}`
- `tmdb_cache/{cacheKey}` (72-hour cache)

## Recommendation Notes

Scoring combines:

- profile feature similarity
- TMDB source confidence (similar > recommendation > discover > trending)
- quality
- novelty
- recency

Blend policy is 75% exploitation / 25% exploration.

## Tests

```bash
npm run test
```

Includes unit tests for recommendation ranking behavior.

Run Firestore security rules tests (emulator-backed):

```bash
npm run test:rules
```

This executes `tests/firestore.rules.spec.ts` against the Firestore emulator.

## Firestore Rules + Indexes

This repo includes:

- `firestore.rules`
- `firestore.indexes.json`
- `firebase.json`

Deploy to your Firebase project:

```bash
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

## E2E Tests (Playwright)

Install dependencies:

```bash
npm install
```

Install browser once:

```bash
npx playwright install chromium
```

Run E2E suite:

```bash
npm run test:e2e
```

The Playwright config starts Next.js with `NEXT_PUBLIC_E2E_MODE=true` and `E2E_BYPASS_AUTH=true`, and tests mock API routes so no live Firebase/TMDB calls are required.

## CI

GitHub Actions workflow is defined at `.github/workflows/ci.yml` and runs on every push and pull request:

- lint
- unit tests
- production build
- Firestore emulator-backed rules tests
