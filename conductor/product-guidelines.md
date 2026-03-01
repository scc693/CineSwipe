# Product Guidelines

## Voice and Tone

- Clear, concise, and utility-first.
- Avoid hype language in UI copy.
- Keep interaction feedback immediate and unambiguous.

## UX Principles

- Prioritize gesture clarity: each swipe direction maps to a single outcome.
- Minimize decision fatigue with one-card-at-a-time discovery.
- Keep controls thumb-friendly and accessible on small screens.

## Visual and Interaction Rules

- Emphasize content artwork while preserving readable metadata.
- Use consistent directional cues across onboarding, deck UI, and help text.
- Preserve continuity between discover actions and library outcomes.

## Reliability and Trust

- Never silently drop user interactions.
- Prefer explicit error states with clear recovery actions.
- Keep data operations idempotent where possible (e.g., swipe undo).

## Platform Expectations

- PWA-capable behavior for repeat usage.
- Strong performance on mobile networks.
- Deployment and rules changes must be reproducible via CI workflows.
