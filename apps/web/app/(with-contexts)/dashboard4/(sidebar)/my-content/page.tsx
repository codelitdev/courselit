"use client";

import { useState, useEffect, useContext } from "react";
import { ContentCard } from "@/components/admin/my-content/content-card";
import { SkeletonCard } from "@/components/admin/my-content/skeleton-card";
import type { ContentItem } from "@/components/admin/my-content/content";
import { AddressContext, ProfileContext } from "@components/contexts";
import { MY_CONTENT_HEADER } from "@ui-config/strings";
import DashboardContent from "@components/admin/dashboard-content";
import { FetchBuilder } from "@courselit/utils";
import { Constants, MembershipEntityType } from "@courselit/common-models";
import { Link } from "@courselit/components-library";

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
                <Link
                    key={item.entity.id}
                    href={
                        type === Constants.MembershipEntityType.COURSE
                            ? `/course/${item.entity.slug}/${item.entity.id}`
                            : `/dashboard4/community/${item.entity.id}`
                    }
                >
                    <ContentCard item={item} />
                </Link>
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

    useEffect(() => {
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
    }, [address.backend, profile.userId]);

    const courses = data.filter((item) => item.entityType === "course");
    const communities = data.filter((item) => item.entityType === "community");

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="space-y-12">
                <h1 className="text-4xl font-bold">My Content</h1>

                <section>
                    <h2 className="text-2xl font-bold mb-6">My Products</h2>
                    {loading ? (
                        <SkeletonGrid />
                    ) : (
                        <ContentGrid
                            items={courses}
                            type={Constants.MembershipEntityType.COURSE}
                        />
                    )}
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-6">My Communities</h2>
                    {loading ? (
                        <SkeletonGrid />
                    ) : (
                        <ContentGrid
                            items={communities}
                            type={Constants.MembershipEntityType.COMMUNITY}
                        />
                    )}
                </section>
            </div>
        </DashboardContent>
    );
}
