"use client";

import { useState, useEffect, useContext } from "react";
import type { ContentItem } from "@/components/admin/my-content/content";
import {
    AddressContext,
    ProfileContext,
    ThemeContext,
} from "@components/contexts";
import { MY_CONTENT_HEADER } from "@ui-config/strings";
import DashboardContent from "@components/admin/dashboard-content";
import { FetchBuilder } from "@courselit/utils";
import { Constants, MembershipEntityType } from "@courselit/common-models";
import { MyContentCard } from "@components/admin/my-content/content-card";
import { BookOpen, Users } from "lucide-react";
import Link from "next/link";
import { SkeletonCard } from "@components/skeleton-card";
import { Button } from "@courselit/page-primitives";

function ContentGrid({
    items,
    type,
}: {
    items: ContentItem[];
    type: MembershipEntityType;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
                <MyContentCard key={item.entity.id} item={item} />
            ))}
        </div>
    );
}

function SkeletonGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
                <SkeletonCard key={index} />
            ))}
        </div>
    );
}
const breadcrumbs = [{ label: MY_CONTENT_HEADER, href: "#" }];

export default function Page() {
    const [data, setData] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { profile } = useContext(ProfileContext);
    const address = useContext(AddressContext);
    const { theme } = useContext(ThemeContext);

    useEffect(() => {
        if (!profile) {
            return;
        }
        const getUserContent = async () => {
            const query = `
            query {
                content: getUserContent {
                    entityType
                    entity {
                        id
                        title
                        slug
                        membersCount
                        totalLessons
                        completedLessonsCount
                        featuredImage {
                            file
                            thumbnail
                        }
                        type
                        certificateId
                    }
                }
            }
            `;
            try {
                const fetch = new FetchBuilder()
                    .setUrl(`${address.backend}/api/graph`)
                    .setPayload(query)
                    .setIsGraphQLEndpoint(true)
                    .build();
                setLoading(true);
                const response = await fetch.exec();
                if (response.content) {
                    setData(response.content);
                }
            } catch (e: any) {
            } finally {
                setLoading(false);
            }
        };

        getUserContent();
    }, [address.backend, profile?.userId]);

    const courses = data.filter(
        (item) => item.entityType.toLowerCase() === "course",
    );
    const communities = data.filter(
        (item) => item.entityType.toLowerCase() === "community",
    );

    const EmptyStateMessage = ({ type }: { type: MembershipEntityType }) => (
        <div className="text-center py-12">
            <div className="flex justify-center mb-4">
                {type === Constants.MembershipEntityType.COURSE ? (
                    <BookOpen className="w-12 h-12 text-muted-foreground" />
                ) : (
                    <Users className="w-12 h-12 text-muted-foreground" />
                )}
            </div>
            <p className="text-muted-foreground mb-4">
                {type === Constants.MembershipEntityType.COURSE
                    ? "You haven't enrolled in any products yet."
                    : "You haven't joined any communities yet."}{" "}
            </p>
            {type === Constants.MembershipEntityType.COURSE ? (
                <Link href="/products" className="text-primary">
                    <Button size="sm" theme={theme.theme}>
                        Browse products
                    </Button>
                </Link>
            ) : (
                <Link href="/communities" className="text-primary">
                    <Button size="sm" theme={theme.theme}>
                        Browse communities
                    </Button>
                </Link>
            )}
        </div>
    );

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="space-y-12">
                <h1 className="text-4xl font-bold">My Content</h1>

                <section>
                    <h2 className="text-xl font-semibold mb-6">My Products</h2>
                    {loading ? (
                        <SkeletonGrid />
                    ) : courses.length > 0 ? (
                        <ContentGrid
                            items={courses}
                            type={Constants.MembershipEntityType.COURSE}
                        />
                    ) : (
                        <EmptyStateMessage type="course" />
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-6">
                        My Communities
                    </h2>
                    {loading ? (
                        <SkeletonGrid />
                    ) : communities.length > 0 ? (
                        <ContentGrid
                            items={communities}
                            type={Constants.MembershipEntityType.COMMUNITY}
                        />
                    ) : (
                        <EmptyStateMessage type="community" />
                    )}
                </section>
            </div>
        </DashboardContent>
    );
}
