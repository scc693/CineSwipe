# Tech Stack

## Application Runtime

- Node.js 20+
- Next.js 15 (App Router)
- React 19
- TypeScript 5

## Backend and Data

- Next.js route handlers (`src/app/api/*`) for current server APIs
- Firebase Authentication (Google provider)
- Cloud Firestore for user data, lists, interactions, and cache metadata
- Firebase Admin SDK for privileged server operations

## External Integrations

- TMDB API for title metadata, candidate generation, and images

## Validation and Type Safety

- Zod for request validation and schema contracts
- Strict TypeScript types in shared library modules

## Testing and Quality

- Vitest for unit and Firestore rules tests
- Firestore Emulator via `firebase emulators:exec`
- Playwright for E2E flows
- ESLint via `next lint` (planned migration to ESLint CLI before Next.js 16)

## CI/CD and Deployment

- GitHub Actions CI workflow for lint/test/build/rules checks
- GitHub Actions deploy workflow (manual dispatch) for:
  - Firestore rules/indexes deploy
  - Firebase App Hosting rollout creation
- Auth path: OIDC preferred, service account JSON fallback

## Planned Architecture Evolution

- Current state: Next.js API routes host business logic.
- Planned track: migrate backend endpoints to explicit Firebase Functions architecture in phases, while keeping contract compatibility for clients.
