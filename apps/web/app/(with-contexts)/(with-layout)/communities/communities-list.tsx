"use client";

import { useCommunities } from "@/hooks/use-communities";
import { CommunityContentCard } from "./content-card";
import { PaginationControls } from "@components/public/pagination";
import { Community } from "@courselit/common-models";
import { Users } from "lucide-react";
import { SkeletonCard } from "@components/skeleton-card";
import { useContext } from "react";
import { ThemeContext } from "@components/contexts";
import { Button, Header3, Text2 } from "@courselit/page-primitives";

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
    const { theme } = useContext(ThemeContext);

    if (!loading && totalPages === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <Header3 theme={theme.theme}>No Communities Found</Header3>
                <Text2 theme={theme.theme}>
                    {publicView ? "The team " : "You have "} not added any
                    communities yet.
                </Text2>
            </div>
        );
    }

    if (!loading && totalPages && communities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <Text2 theme={theme.theme}>This page is empty.</Text2>
                <Button
                    variant="outline"
                    theme={theme.theme}
                    onClick={() => onPageChange(1)}
                >
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
