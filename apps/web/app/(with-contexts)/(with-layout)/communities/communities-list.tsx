"use client";

import { useCommunities } from "@/hooks/use-communities";
import { CommunityContentCard } from "./content-card";
import { PaginationControls } from "@components/public/pagination";
import { Community } from "@courselit/common-models";
import { Users } from "lucide-react";
import { Button } from "@components/ui/button";
import { SkeletonCard } from "@components/skeleton-card";

const ITEMS_PER_PAGE = 9;

export function CommunitiesList({
    itemsPerPage = ITEMS_PER_PAGE,
    publicView = true,
    page,
    onPageChange,
}: {
    itemsPerPage?: number;
    publicView?: boolean;
    page: number;
    onPageChange: (page: number) => void;
}) {
    const { communities, loading, totalPages } = useCommunities(
        page,
        itemsPerPage,
    );

    if (!loading && totalPages === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                    No Communities Found
                </h3>
                <p className="text-muted-foreground">
                    {publicView ? "The team " : "You have "} not added any
                    communities yet.
                </p>
            </div>
        );
    }

    if (!loading && totalPages && communities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                    This page is empty.
                </p>
                <Button variant="outline" onClick={() => onPageChange(1)}>
                    Go to first page
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading
                    ? Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                          <SkeletonCard key={index} />
                      ))
                    : communities.map((community: Community) => (
                          <CommunityContentCard
                              key={community.communityId}
                              community={community}
                              publicView={publicView}
                          />
                      ))}
            </div>
            <PaginationControls
                currentPage={page}
                totalPages={Math.ceil(totalPages / itemsPerPage)}
                onPageChange={onPageChange}
            />
        </div>
    );
}
