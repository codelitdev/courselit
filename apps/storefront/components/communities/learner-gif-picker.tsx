"use client";

import type {
  gifSchema,
  learnerGifSearchResponseSchema,
} from "@courselit/api-contract";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import {
  LearnerButton as Button,
  LearnerCaption,
  LearnerCardImage,
  LearnerInput,
  LearnerPopover,
  LearnerPopoverContent,
  LearnerPopoverTrigger,
  LearnerText2,
} from "@/components/themed-page-builder";
import { requestJson } from "@/lib/request-json";

type Gif = z.infer<typeof gifSchema>;
type GifSearchResponse = z.infer<typeof learnerGifSearchResponseSchema>;

export const MAX_POST_GIFS = 10;

const SEARCH_DEBOUNCE_MS = 300;

function searchGifs(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  const suffix = params.size > 0 ? `?${params}` : "";
  return requestJson<GifSearchResponse>(`/api/v1/learner/gifs${suffix}`, { signal });
}

/**
 * Trending GIFs, fetched once per page load. The response also tells whether
 * GIF search is configured, so the picker can stay hidden when it is not.
 */
let trendingRequest: Promise<GifSearchResponse> | null = null;
function loadTrendingGifs() {
  trendingRequest ??= searchGifs("").catch((error: unknown) => {
    trendingRequest = null;
    throw error;
  });
  return trendingRequest;
}

function useGifSearchConfigured() {
  const [configured, setConfigured] = useState(false);
  useEffect(() => {
    let active = true;
    loadTrendingGifs()
      .then((response) => {
        if (active) setConfigured(response.configured);
      })
      .catch(() => {
        if (active) setConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return configured;
}

function GifResults({ onSelect }: { onSelect: (url: string) => void }) {
  const [search, setSearch] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestSeqRef.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const query = search.trim();
    const timer = window.setTimeout(
      () => {
        (query ? searchGifs(query, controller.signal) : loadTrendingGifs())
          .then((response) => {
            if (requestId === requestSeqRef.current) setGifs(response.items);
          })
          .catch((caught: unknown) => {
            if ((caught as Error).name === "AbortError") return;
            if (requestId === requestSeqRef.current) {
              setGifs([]);
              setError("Unable to load GIFs right now.");
            }
          })
          .finally(() => {
            if (requestId === requestSeqRef.current) setLoading(false);
          });
      },
      query ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  return (
    <div className="grid w-full gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <LearnerInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search GIFs"
          aria-label="Search GIFs"
          className="pl-8"
          autoFocus
        />
      </div>
      <div className="h-[300px] overflow-y-auto">
        {loading ? (
          <LearnerText2 className="flex h-full items-center justify-center text-muted-foreground">
            Loading GIFs…
          </LearnerText2>
        ) : error ? (
          <LearnerText2 className="flex h-full items-center justify-center text-destructive">
            {error}
          </LearnerText2>
        ) : gifs.length === 0 ? (
          <LearnerText2 className="flex h-full items-center justify-center text-muted-foreground">
            No GIFs found.
          </LearnerText2>
        ) : (
          <ul className="grid list-none grid-cols-2 gap-2 p-0" aria-label="GIF results">
            {gifs.map((gif) => (
              <li key={gif.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full p-0"
                  onClick={() => onSelect(gif.url)}
                  aria-label={`Add GIF: ${gif.title}`}
                >
                  <LearnerCardImage
                    src={gif.previewUrl}
                    alt={gif.title}
                    loading="lazy"
                    className="h-auto w-full object-cover"
                  />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <LearnerCaption className="text-right text-muted-foreground">
        Powered by GIPHY
      </LearnerCaption>
    </div>
  );
}

/** A GIF button that opens GIF search. Renders nothing when GIF search is not configured. */
export function LearnerGifPicker({
  onSelect,
  disabled = false,
  variant = "ghost",
  label,
}: {
  onSelect: (url: string) => void;
  disabled?: boolean;
  variant?: "ghost" | "outline";
  label?: string;
}) {
  const configured = useGifSearchConfigured();
  const [open, setOpen] = useState(false);
  if (!configured) return null;

  return (
    <LearnerPopover open={open} onOpenChange={setOpen} modal>
      <LearnerPopoverTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={label ? "sm" : "icon"}
          disabled={disabled}
          aria-label="Add GIF"
          title={
            disabled ? `A post can contain up to ${MAX_POST_GIFS} GIFs.` : undefined
          }
        >
          <span className="text-xs font-semibold" aria-hidden="true">
            GIF
          </span>
          {label ? <span>{label}</span> : null}
        </Button>
      </LearnerPopoverTrigger>
      <LearnerPopoverContent className="w-80" align="start">
        {open ? (
          <GifResults
            onSelect={(url) => {
              onSelect(url);
              setOpen(false);
            }}
          />
        ) : null}
      </LearnerPopoverContent>
    </LearnerPopover>
  );
}

/** GIFs attached to a post. With `onRemove`, each GIF gets a remove button. */
export function LearnerPostGifs({
  urls,
  onRemove,
}: {
  urls: readonly string[];
  onRemove?: (url: string) => void;
}) {
  if (urls.length === 0) return null;
  return (
    <ul className="flex list-none flex-wrap gap-3 p-0" aria-label="GIFs">
      {urls.map((url) => (
        <li key={url} className="relative">
          <LearnerCardImage
            src={url}
            alt="GIF"
            loading="lazy"
            className="h-48 w-auto max-w-full object-cover"
          />
          {onRemove ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute top-2 right-2 size-7"
              onClick={() => onRemove(url)}
              aria-label="Remove GIF"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Adds a GIF to a list, ignoring duplicates and the per-post limit. */
export function withGif(urls: readonly string[], url: string): string[] {
  if (urls.includes(url) || urls.length >= MAX_POST_GIFS) return [...urls];
  return [...urls, url];
}
