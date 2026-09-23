"use client";

import type { publicCommunityListItemSchema } from "@courselit/api-contract";
import { Button, Header1, Subheader1, Text2 } from "@frontlit/page-builder/primitives";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { PublicCatalogCard } from "@/components/public-catalog-card";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/course-lit-loader";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

type PublicCommunity = z.infer<typeof publicCommunityListItemSchema>;

export function PublicCommunitiesCatalog() {
  const theme = useSchoolThemeStyle();
  const [communities, setCommunities] = useState<PublicCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/public/communities?limit=12", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setError(true);
          return;
        }
        const body = (await response.json()) as {
          items?: PublicCommunity[];
          nextCursor?: string | null;
        };
        setCommunities(body.items ?? []);
        setNextCursor(body.nextCursor ?? null);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const query = new URLSearchParams({
        cursor: nextCursor,
        limit: "12",
      });
      const response = await fetch(`/api/v1/public/communities?${query.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      const body = (await response.json()) as {
        items?: PublicCommunity[];
        nextCursor?: string | null;
      };
      setCommunities((current) => [...current, ...(body.items ?? [])]);
      setNextCursor(body.nextCursor ?? null);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <Header1 theme={theme}>Communities</Header1>
        <Subheader1 theme={theme} component="span">
          Learn together, ask questions, and share progress.
        </Subheader1>
      </header>

      {error ? (
        <Text2 theme={theme}>We couldn’t load communities right now.</Text2>
      ) : loading ? (
        <CourseLitLoading label="Loading communities" className="min-h-32" />
      ) : communities.length === 0 ? (
        <Text2 theme={theme}>No communities are available yet.</Text2>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => {
            const image = community.featuredImage;
            return (
              <PublicCatalogCard
                key={community.id}
                href={`/p/${encodeURIComponent(community.slug || community.id)}`}
                title={community.name}
                image={image}
                priceMinor={community.priceMinor}
                currency={community.currency}
                meta={
                  <span className="inline-flex items-center gap-2">
                    <Users className="size-4" aria-hidden="true" />
                    {community.membersCount.toLocaleString()} members
                  </span>
                }
              />
            );
          })}
        </div>
      )}

      {!loading && !error && nextCursor ? (
        <div className="flex justify-center">
          <Button
            type="button"
            theme={theme}
            variant="outline"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            aria-label={loadingMore ? "Loading communities" : "Load more communities"}
          >
            {loadingMore ? (
              <CourseLitLoadingIcon size={14} />
            ) : (
              "Load more communities"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
