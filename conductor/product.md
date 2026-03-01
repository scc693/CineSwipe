# Initial Concept

CineSwipe is a swipe-first movie and TV discovery web app where users train recommendations with directional gestures and manage watchlist/rewatch intent.

## Product Vision

Deliver a fast, mobile-friendly discovery experience that learns from explicit feedback and reduces browsing fatigue.

## Target Users

- Casual streamers who want quick suggestions instead of long searches.
- Movie/TV enthusiasts who maintain watchlist and rewatch queues.
- Mobile-first users who prefer gesture-driven interactions.

## Core User Goals

- Seed the system with known titles.
- Discover one recommendation at a time with low friction.
- Track liked/disliked/hidden/saved items in structured library views.

## Primary Product Surfaces

- Discover swipe deck (`/discover`)
- Library management (`/library`)
- Authentication and user profile context
- API layer for search, seeds, recommendations, swipes, undo, and library reads

## Success Criteria

- Responsive experience on mobile and desktop.
- Recommendation quality improves after user interactions.
- Stable CI + deployment path for Firestore rules/indexes and App Hosting rollouts.
