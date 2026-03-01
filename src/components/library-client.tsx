"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { authedJson } from "@/lib/client-api";
import { genreLabel } from "@/lib/media";
import { LibraryItem, ListType } from "@/lib/types";

interface LibraryResponse {
  items: LibraryItem[];
}

export function LibraryClient() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [listType, setListType] = useState<ListType>("watchlist");
  const [mediaType, setMediaType] = useState<"all" | "movie" | "tv">("all");
  const [genre, setGenre] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchLibrary() {
    if (!user) return;

    setBusy(true);
    setError(null);

    try {
      const query = new URLSearchParams({ listType, mediaType, sort: "recent" });
      if (genre !== null) {
        query.set("genre", String(genre));
      }

      const payload = await authedJson<LibraryResponse>(`/api/library?${query.toString()}`);
      setItems(payload.items);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load library");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    void fetchLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, listType, mediaType, genre]);

  const genreOptions = useMemo(() => {
    const bag = new Set<number>();
    items.forEach((item) => item.genreIds.forEach((genreId) => bag.add(genreId)));
    return [...bag].sort((a, b) => a - b);
  }, [items]);

  const movies = useMemo(() => items.filter((item) => item.mediaType === "movie"), [items]);
  const shows = useMemo(() => items.filter((item) => item.mediaType === "tv"), [items]);

  if (loading) {
    return (
      <section className="panel">
        <p className="muted">Loading account...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="panel hero-panel">
        <h1>Library</h1>
        <p>Sign in to view your watchlist and rewatch queue.</p>
        <button className="primary-btn" onClick={() => signInWithGoogle()} type="button">
          Sign in with Google
        </button>
      </section>
    );
  }

  return (
    <div className="library-grid">
      <header>
        <h1 className="page-title">Library</h1>
        <p className="muted">Organized by list category, media type, and genres.</p>
      </header>

      <section className="panel controls-panel">
        <div className="chip-row">
          <button
            className={listType === "watchlist" ? "chip chip-active" : "chip"}
            onClick={() => setListType("watchlist")}
            type="button"
          >
            Watchlist
          </button>
          <button
            className={listType === "rewatch" ? "chip chip-active" : "chip"}
            onClick={() => setListType("rewatch")}
            type="button"
          >
            Rewatch
          </button>
        </div>

        <div className="chip-row">
          <button className={mediaType === "all" ? "chip chip-active" : "chip"} onClick={() => setMediaType("all")} type="button">
            All
          </button>
          <button className={mediaType === "movie" ? "chip chip-active" : "chip"} onClick={() => setMediaType("movie")} type="button">
            Movies
          </button>
          <button className={mediaType === "tv" ? "chip chip-active" : "chip"} onClick={() => setMediaType("tv")} type="button">
            TV Shows
          </button>
        </div>

        <div className="chip-row">
          <button className={genre === null ? "chip chip-active" : "chip"} onClick={() => setGenre(null)} type="button">
            All Genres
          </button>
          {genreOptions.map((genreId) => (
            <button
              className={genre === genreId ? "chip chip-active" : "chip"}
              key={genreId}
              onClick={() => setGenre(genreId)}
              type="button"
            >
              {genreLabel(genreId)}
            </button>
          ))}
        </div>
      </section>

      {busy ? <p className="muted">Refreshing library...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section>
        <h2 className="section-title">Movies</h2>
        <div className="library-list">
          {movies.map((item) => (
            <article className="library-card" key={`movie_${item.id}`}>
              <div className="library-poster">
                {item.posterUrl ? (
                  <Image alt={item.title} fill sizes="96px" src={item.posterUrl} />
                ) : (
                  <div className="poster-fallback">No Poster</div>
                )}
              </div>
              <div>
                <p className="result-title">{item.title}</p>
                <p className="muted clamp-2">{item.overview || "No summary available"}</p>
              </div>
            </article>
          ))}
          {movies.length === 0 ? <p className="muted">No movies in this view.</p> : null}
        </div>
      </section>

      <section>
        <h2 className="section-title">TV Shows</h2>
        <div className="library-list">
          {shows.map((item) => (
            <article className="library-card" key={`tv_${item.id}`}>
              <div className="library-poster">
                {item.posterUrl ? (
                  <Image alt={item.title} fill sizes="96px" src={item.posterUrl} />
                ) : (
                  <div className="poster-fallback">No Poster</div>
                )}
              </div>
              <div>
                <p className="result-title">{item.title}</p>
                <p className="muted clamp-2">{item.overview || "No summary available"}</p>
              </div>
            </article>
          ))}
          {shows.length === 0 ? <p className="muted">No TV shows in this view.</p> : null}
        </div>
      </section>
    </div>
  );
}
