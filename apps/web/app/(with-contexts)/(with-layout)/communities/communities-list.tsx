"use client";

import { useState } from "react";
import { useCommunities } from "@/hooks/use-communities";
import { SkeletonCard } from "./skeleton-card";
import { ContentCard } from "./content-card";
import { PaginationControls } from "@components/public/pagination";
import { Community } from "@courselit/common-models";

const ITEMS_PER_PAGE = 9;

export function CommunitiesList({
    itemsPerPage = ITEMS_PER_PAGE,
    publicLink = true,
}: {
    itemsPerPage?: number;
    publicLink?: boolean;
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const { communities, loading, totalPages } = useCommunities(
        currentPage,
        itemsPerPage,
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading
                    ? Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                          <SkeletonCard key={index} />
                      ))
                    : communities.map((community: Community) => (
                          <ContentCard
                              key={community.communityId}
                              community={community}
                              publicLink={publicLink}
                          />
                      ))}
            </div>
            <PaginationControls
                currentPage={currentPage}
                totalPages={Math.ceil(totalPages / itemsPerPage)}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
