"use client";

import { useState } from "react";
import { useCommunities } from "@/components/hooks/use-communities";
import { SkeletonCard } from "./skeleton-card";
import { ContentCard } from "./content-card";
import { PaginationControls } from "@components/public/pagination";
import { ContentItem } from "./types";

const ITEMS_PER_PAGE = 6;

export function CommunitiesList() {
    const [currentPage, setCurrentPage] = useState(1);
    const { communities, loading, totalPages } = useCommunities(
        currentPage,
        ITEMS_PER_PAGE,
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading
                    ? Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                          <SkeletonCard key={index} />
                      ))
                    : communities.map((community: ContentItem) => (
                          <ContentCard
                              key={community.communityId}
                              community={community}
                          />
                      ))}
            </div>
            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
