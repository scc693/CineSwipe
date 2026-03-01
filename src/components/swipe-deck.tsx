"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { RecommendationCard, SwipeDirection } from "@/lib/types";
import { genreLabel } from "@/lib/media";

interface SwipeDeckProps {
  items: RecommendationCard[];
  isBusy: boolean;
  onSwipe: (card: RecommendationCard, direction: SwipeDirection) => Promise<void>;
  onUndo: () => Promise<void>;
}

interface Point {
  x: number;
  y: number;
}

const SWIPE_DISTANCE = 48;

export function SwipeDeck({ items, isBusy, onSwipe, onUndo }: SwipeDeckProps) {
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const topCard = items[0] ?? null;

  const stacked = useMemo(() => items.slice(0, 3), [items]);

  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      if (!topCard || isBusy) return;

      if (event.key === "ArrowLeft") {
        void onSwipe(topCard, "left");
      }
      if (event.key === "ArrowRight") {
        void onSwipe(topCard, "right");
      }
      if (event.key === "ArrowUp") {
        void onSwipe(topCard, "up");
      }
      if (event.key === "ArrowDown") {
        void onSwipe(topCard, "down");
      }
    }

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [isBusy, onSwipe, topCard]);

  function extractPoint(event: React.PointerEvent<HTMLDivElement>): Point {
    return { x: event.clientX, y: event.clientY };
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    setStartPoint(extractPoint(event));
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!startPoint || !topCard || isBusy) return;

    const point = extractPoint(event);
    const deltaX = point.x - startPoint.x;
    const deltaY = point.y - startPoint.y;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < SWIPE_DISTANCE && absY < SWIPE_DISTANCE) {
      return;
    }

    if (absX > absY) {
      void onSwipe(topCard, deltaX > 0 ? "right" : "left");
      return;
    }

    void onSwipe(topCard, deltaY > 0 ? "down" : "up");
  }

  if (!topCard) {
    return (
      <section className="deck-empty panel">
        <h2 className="panel-title">No cards left in your queue</h2>
        <p className="panel-copy">Keep swiping after more results load or tweak your seed titles in Discover.</p>
        <button className="ghost-btn" type="button" onClick={() => onUndo()}>
          Undo Last Swipe
        </button>
      </section>
    );
  }

  return (
    <section className="deck-area">
      <div className="deck-stack" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {stacked.map((card, index) => {
          const isTop = index === 0;
          return (
            <article
              key={`${card.mediaType}_${card.id}`}
              className={`media-card ${isTop ? "media-card-top" : "media-card-back"}`}
              style={{
                transform: `translateY(${index * 10}px) scale(${1 - index * 0.02})`,
                zIndex: 50 - index
              }}
            >
              <div className="poster-wrap">
                {card.posterUrl ? (
                  <Image alt={card.title} fill sizes="(max-width: 768px) 100vw, 480px" src={card.posterUrl} />
                ) : (
                  <div className="poster-fallback">No Poster</div>
                )}
              </div>

              <div className="card-content">
                <p className="media-pill">{card.mediaType.toUpperCase()}</p>
                <h3>{card.title}</h3>
                <p className="muted">Rating: {card.rating ? card.rating.toFixed(1) : "n/a"}</p>
                <p className="clamp-3">{card.overview || "No summary available."}</p>
                <div className="chip-row">
                  {card.genreIds.slice(0, 4).map((genreId) => (
                    <span className="chip chip-static" key={genreId}>
                      {genreLabel(genreId)}
                    </span>
                  ))}
                </div>
                <ul className="explain-list">
                  {card.explanation.map((text) => (
                    <li key={`${card.id}-${text}`}>{text}</li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>

      <div className="swipe-controls">
        <button className="swipe-btn swipe-left" disabled={isBusy} onClick={() => onSwipe(topCard, "left")} type="button">
          Left: Seen, disliked
        </button>
        <button className="swipe-btn swipe-up" disabled={isBusy} onClick={() => onSwipe(topCard, "up")} type="button">
          Up: Save
        </button>
        <button className="swipe-btn swipe-right" disabled={isBusy} onClick={() => onSwipe(topCard, "right")} type="button">
          Right: Seen, liked
        </button>
        <button className="swipe-btn swipe-down" disabled={isBusy} onClick={() => onSwipe(topCard, "down")} type="button">
          Down: Not interested
        </button>
      </div>

      <button className="ghost-btn" disabled={isBusy} onClick={() => onUndo()} type="button">
        Undo Last Swipe
      </button>
    </section>
  );
}
