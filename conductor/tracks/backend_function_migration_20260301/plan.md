# Implementation Plan: backend_function_migration_20260301

## Phase 1: Baseline and Migration Design

- [ ] Task: Audit current Next.js route handlers and shared dependencies
    - [ ] Enumerate handlers, imported modules, and side effects for each `/api/*` route.
    - [ ] Capture auth, validation, and Firestore access expectations per endpoint.
    - [ ] Record baseline request/response examples for success and failure paths.
- [ ] Task: Define function-oriented target architecture and migration order
    - [ ] Decide endpoint migration batches by risk and coupling.
    - [ ] Define runtime, naming, and routing conventions for function handlers.
    - [ ] Produce a migration matrix mapping old route -> new function + rollback path.
- [ ] Task: Create architecture decision record for migration constraints
    - [ ] Document compatibility requirements and non-goals.
    - [ ] Document observability and rollback expectations.
    - [ ] Document CI/deploy implications for phased rollout.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Baseline and Migration Design' (Protocol in workflow.md)

## Phase 2: Functions Foundation and Shared Contracts

- [ ] Task: Initialize Firebase Functions TypeScript workspace
    - [ ] Create functions project structure and deterministic npm scripts for build/lint/test.
    - [ ] Configure local emulator commands for function-level testing.
    - [ ] Ensure CI can execute functions checks non-interactively.
- [ ] Task: Extract and normalize shared API contracts
    - [ ] Move/define shared Zod schemas for migrated endpoints.
    - [ ] Centralize request/response typing to reduce contract drift.
    - [ ] Add test fixtures for common success and error payloads.
- [ ] Task: Implement auth and error-handling middleware equivalents
    - [ ] Recreate Firebase token verification behavior in function handlers.
    - [ ] Standardize HTTP status mapping and error envelope format.
    - [ ] Add tests for unauthenticated and invalid-input paths.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Functions Foundation and Shared Contracts' (Protocol in workflow.md)

## Phase 3: Incremental Endpoint Migration

- [ ] Task: Migrate low-coupling endpoints first (`/api/search`, `/api/seeds`)
    - [ ] Write failing contract-parity tests before migration.
    - [ ] Implement function handlers and pass parity tests.
    - [ ] Validate TMDB and Firestore interaction behavior parity.
- [ ] Task: Migrate recommendation and interaction endpoints
    - [ ] Migrate `/api/recommendations/next` with deterministic scoring behavior checks.
    - [ ] Migrate `/api/swipes` and `/api/swipes/undo` with idempotency/undo tests.
    - [ ] Migrate `/api/library` read behavior with filtering parity tests.
- [ ] Task: Introduce rollout and rollback controls
    - [ ] Implement traffic switch strategy (feature flag or routing toggle).
    - [ ] Define and test rollback runbook for each migrated batch.
    - [ ] Add deployment smoke tests for migrated paths.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Incremental Endpoint Migration' (Protocol in workflow.md)

## Phase 4: Cutover, Hardening, and Documentation

- [ ] Task: Complete production cutover readiness checks
    - [ ] Run full lint/test/build/rules/e2e suite against cutover candidate.
    - [ ] Verify performance and error-rate baseline against pre-migration metrics.
    - [ ] Confirm secrets/config are correctly sourced in all environments.
- [ ] Task: Finalize operational documentation
    - [ ] Update README and deployment docs for function-first backend operations.
    - [ ] Document ongoing maintenance tasks and ownership boundaries.
    - [ ] Document post-cutover incident response and rollback escalation.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Cutover, Hardening, and Documentation' (Protocol in workflow.md)
