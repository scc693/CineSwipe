"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { SeedPicker } from "@/components/seed-picker";
import { SwipeDeck } from "@/components/swipe-deck";
import { authedJson } from "@/lib/client-api";
import { RecommendationCard, SeedItem, SwipeDirection } from "@/lib/types";

interface RecommendationResponse {
  requiresSeed?: boolean;
  items: RecommendationCard[];
  nextCursor: string | null;
  totalCandidates?: number;
}

export function DiscoverClient() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [cards, setCards] = useState<RecommendationCard[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>("0");
  const [needsSeed, setNeedsSeed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSwiped, setLastSwiped] = useState<RecommendationCard | null>(null);

  const hasCards = cards.length > 0;

  async function fetchRecommendations(reset = false) {
    if (!user) return;

    const cursor = reset ? "0" : nextCursor ?? "0";
    if (!reset && nextCursor === null) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const payload = await authedJson<RecommendationResponse>(
        `/api/recommendations/next?cursor=${encodeURIComponent(cursor)}&limit=20`
      );

      if (payload.requiresSeed) {
        setNeedsSeed(true);
        setCards([]);
        setNextCursor("0");
        return;
      }

      setNeedsSeed(false);
      setNextCursor(payload.nextCursor);
      setCards((prev) => (reset ? payload.items : [...prev, ...payload.items]));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to fetch recommendations");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setCards([]);
      setNeedsSeed(false);
      setNextCursor("0");
      return;
    }

    void fetchRecommendations(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function saveSeeds(items: SeedItem[]) {
    await authedJson<{ ok: boolean }>("/api/seeds", {
      method: "POST",
      body: JSON.stringify({ items })
    });

    setNeedsSeed(false);
    setCards([]);
    setNextCursor("0");
    await fetchRecommendations(true);
  }

  async function handleSwipe(card: RecommendationCard, direction: SwipeDirection) {
    if (!user || busy) return;

    setBusy(true);
    setError(null);

    setCards((prev) => prev.slice(1));
    setLastSwiped(card);

    try {
      await authedJson<{ ok: boolean }>("/api/swipes", {
        method: "POST",
        body: JSON.stringify({
          mediaId: card.id,
          mediaType: card.mediaType,
          direction,
          media: card
        })
      });

      if (cards.length <= 6) {
        await fetchRecommendations(false);
      }
    } catch (swipeError) {
      setCards((prev) => [card, ...prev]);
      setError(swipeError instanceof Error ? swipeError.message : "Swipe failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!user || !lastSwiped || busy) return;

    setBusy(true);
    setError(null);

    try {
      const payload = await authedJson<{ restored: boolean }>("/api/swipes/undo", {
        method: "POST",
        body: JSON.stringify({})
      });

      if (payload.restored) {
        setCards((prev) => [lastSwiped, ...prev]);
        setLastSwiped(null);
      }
    } catch (undoError) {
      setError(undoError instanceof Error ? undoError.message : "Undo failed");
    } finally {
      setBusy(false);
    }
  }

  const signedOut = useMemo(() => !loading && !user, [loading, user]);

  if (loading) {
    return (
      <section className="panel">
        <p className="muted">Loading account...</p>
      </section>
    );
  }

  if (signedOut) {
    return (
      <section className="panel hero-panel">
        <h1>Personalized Discovery, Powered By Your Swipes</h1>
        <p>
          Sign in to start building a profile from titles you already know. Then swipe to tune recommendations in real time.
        </p>
        <button className="primary-btn" onClick={() => signInWithGoogle()} type="button">
          Sign in with Google
        </button>
      </section>
    );
  }

  if (needsSeed) {
    return <SeedPicker onSubmitSeeds={saveSeeds} />;
  }

  return (
    <div className="discover-grid">
      <section>
        <h1 className="page-title">Discover</h1>
        <p className="muted">Swipe left/right/up/down or use your keyboard arrows for fast triage.</p>
      </section>

      {error ? <p className="error-text">{error}</p> : null}

      {hasCards ? (
        <SwipeDeck items={cards} isBusy={busy} onSwipe={handleSwipe} onUndo={handleUndo} />
      ) : (
        <section className="panel">
          <p className="muted">No recommendations loaded yet.</p>
          <button className="primary-btn" type="button" onClick={() => fetchRecommendations(true)}>
            Load Recommendations
          </button>
        </section>
      )}
    </div>
  );
}
