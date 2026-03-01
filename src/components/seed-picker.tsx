"use client";

import { FormEvent, useMemo, useState } from "react";
import { authedJson } from "@/lib/client-api";
import { MediaSummary, SeedItem } from "@/lib/types";

interface SearchResponse {
  results: MediaSummary[];
}

interface SeedPickerProps {
  onSubmitSeeds: (items: SeedItem[]) => Promise<void>;
}

function toSeedItem(media: MediaSummary): SeedItem {
  return {
    mediaId: media.id,
    mediaType: media.mediaType,
    title: media.title,
    genreIds: media.genreIds
  };
}

export function SeedPicker({ onSubmitSeeds }: SeedPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaSummary[]>([]);
  const [selected, setSelected] = useState<SeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = query.trim().length > 0 && !loading;
  const canSave = selected.length > 0 && !saving;

  const selectedKeys = useMemo(
    () => new Set(selected.map((item) => `${item.mediaType}_${item.mediaId}`)),
    [selected]
  );

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSearch) return;

    setLoading(true);
    setError(null);

    try {
      const payload = await authedJson<SearchResponse>("/api/search", {
        method: "POST",
        body: JSON.stringify({ query: query.trim() })
      });
      setResults(payload.results);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Failed to search TMDB");
    } finally {
      setLoading(false);
    }
  }

  function addSeed(media: MediaSummary) {
    if (selected.length >= 5) return;
    const seed = toSeedItem(media);
    const key = `${seed.mediaType}_${seed.mediaId}`;
    if (selectedKeys.has(key)) return;
    setSelected((prev) => [...prev, seed]);
  }

  function removeSeed(mediaType: "movie" | "tv", mediaId: number) {
    setSelected((prev) => prev.filter((item) => !(item.mediaType === mediaType && item.mediaId === mediaId)));
  }

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    try {
      await onSubmitSeeds(selected);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save seeds");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <h2 className="panel-title">Seed Your Taste Profile</h2>
      <p className="panel-copy">
        Add at least one title you have seen and liked. You can add up to five for better first-pass recommendations.
      </p>

      <form className="search-row" onSubmit={handleSearch}>
        <input
          className="text-input"
          placeholder="Search a movie or show you've seen"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="primary-btn" type="submit" disabled={!canSearch}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="seed-selected">
        <p className="muted">Selected seeds ({selected.length}/5)</p>
        <div className="chip-row">
          {selected.map((seed) => (
            <button
              className="chip"
              key={`${seed.mediaType}_${seed.mediaId}`}
              type="button"
              onClick={() => removeSeed(seed.mediaType, seed.mediaId)}
            >
              {seed.title} <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      </div>

      <div className="search-results">
        {results.map((result) => {
          const key = `${result.mediaType}_${result.id}`;
          const selectedAlready = selectedKeys.has(key);
          return (
            <article className="result-row" key={key}>
              <div>
                <p className="result-title">
                  {result.title} <span className="media-pill">{result.mediaType.toUpperCase()}</span>
                </p>
                <p className="muted clamp-2">{result.overview || "No summary available"}</p>
              </div>
              <button
                className="ghost-btn"
                type="button"
                disabled={selectedAlready || selected.length >= 5}
                onClick={() => addSeed(result)}
              >
                {selectedAlready ? "Added" : "Add"}
              </button>
            </article>
          );
        })}
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-btn" type="button" onClick={submit} disabled={!canSave}>
        {saving ? "Saving Seeds..." : "Start Discovery"}
      </button>
    </section>
  );
}
