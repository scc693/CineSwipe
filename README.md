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

## Deployment (GitHub Actions)

Manual production deployment is defined at `.github/workflows/deploy.yml` and deploys:

- Firestore rules + indexes
- Firebase App Hosting rollout for `main`

### 1) Create GitHub `production` environment

In GitHub, create an environment named `production` and add:

- Environment variables:
  - `FIREBASE_PROJECT_ID`
  - `APPHOSTING_BACKEND_ID`
- Secrets (OIDC path):
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_SERVICE_ACCOUNT_EMAIL`
- Optional fallback secret:
  - `FIREBASE_SERVICE_ACCOUNT_JSON`

### 2) Configure Firebase App Hosting

Create an App Hosting backend once (replace placeholders):

```bash
npx firebase-tools apphosting:backends:create --project <firebase-project-id> --backend <backend-id> --primary-region <region> --root-dir .
```

Use the same backend id for `APPHOSTING_BACKEND_ID`.

### 3) Configure OIDC (recommended)

Grant the GitHub Actions identity permission to impersonate your deploy service account, and grant deploy permissions in Firebase/GCP to that service account. The deploy workflow uses OIDC first, then falls back to `FIREBASE_SERVICE_ACCOUNT_JSON` only if OIDC is unavailable.

### 4) Run deploy

From GitHub Actions, run the `Deploy` workflow manually on branch `main`.

The workflow enforces:

- branch must be `main`
- full validation (`lint`, `test`, `build`, `test:rules`) before deploy
- serialized production deploys via workflow concurrency
