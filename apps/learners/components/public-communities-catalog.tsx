"use client";

import type { communitySchema } from "@courselit/api-contract";
import {
  Button,
  Caption,
  Header1,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardImage,
  Subheader1,
  Text2,
} from "@frontlit/page-builder/primitives";
import { Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

type PublicCommunity = z.infer<typeof communitySchema>;

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
        <Text2 theme={theme}>Loading communities…</Text2>
      ) : communities.length === 0 ? (
        <Text2 theme={theme}>No communities are available yet.</Text2>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => {
            const image = community.featuredMedia;
            return (
              <PageCard
                key={community.id}
                theme={theme}
                isLink
                className="h-full overflow-hidden"
              >
                <Link
                  href={`/communities/${encodeURIComponent(community.id)}`}
                  className="block h-full"
                >
                  <PageCardImage
                    theme={theme}
                    src={
                      image?.thumbnailUrl ??
                      image?.canonicalUrl ??
                      "/courselit_backdrop_square.webp"
                    }
                    alt={image?.altText || community.name}
                    className="aspect-video object-cover"
                  />
                  <PageCardContent theme={theme}>
                    <PageCardHeader theme={theme}>{community.name}</PageCardHeader>
                    <div className="flex items-center text-sm">
                      <Users className="mr-2 size-4" aria-hidden="true" />
                      <Caption theme={theme}>
                        {community.membersCount.toLocaleString()} members
                      </Caption>
                    </div>
                  </PageCardContent>
                </Link>
              </PageCard>
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
          >
            {loadingMore ? "Loading communities…" : "Load more communities"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
