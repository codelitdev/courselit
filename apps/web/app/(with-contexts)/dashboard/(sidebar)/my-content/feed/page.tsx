"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import {
    CommunityMedia,
    CommunityPost,
    Constants,
} from "@courselit/common-models";
import { AddressContext, ProfileContext } from "@components/contexts";
import { extractVideoId, FetchBuilder } from "@courselit/utils";
import { formattedLocaleDate } from "@ui-lib/utils";
import CommunityPostCard from "@components/community/post-card";
import PostCardSkeleton from "@components/community/post-card-skeleton";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AdminEmptyState from "@components/admin/empty-state";
import { PaginatedTable, useToast } from "@courselit/components-library";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { useEnabledCommunities } from "@/hooks/use-enabled-communities";
import {
    MY_CONTENT_BROWSE_COMMUNITIES,
    MY_CONTENT_FEED_EMPTY_DESCRIPTION,
    MY_CONTENT_FEED_COMMUNITIES_EMPTY,
    MY_CONTENT_FEED_COMMUNITIES_TITLE,
    MY_CONTENT_FEED_EMPTY_TITLE,
    TOAST_TITLE_ERROR,
} from "@ui-config/strings";
import { communityPostHref } from "@/lib/community-post-navigation";

type FeedPost = CommunityPost & {
    community: {
        id: string;
        title: string;
    };
};

type FeedCommunity = {
    id: string;
    title: string;
    slug?: string;
    membersCount?: number;
};

type UserContentItem = {
    entityType: string;
    entity: FeedCommunity;
};

const POSTS_PER_PAGE = 20;

function FeedLoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-4">
                {[1, 2, 3].map((post) => (
                    <PostCardSkeleton key={post} />
                ))}
            </div>
            <Card className="order-last h-fit lg:order-none lg:min-w-0">
                <CardHeader>
                    <SkeletonCardTitle />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="h-4 w-full" />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

function SkeletonCardTitle() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-full" />
        </div>
    );
}

export default function Page() {
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [communities, setCommunities] = useState<FeedCommunity[]>([]);
    const [totalPosts, setTotalPosts] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const { profile } = useContext(ProfileContext);
    const address = useContext(AddressContext);
    const router = useRouter();
    const { toast } = useToast();
    const { hasEnabledCommunities, loading: enabledCommunitiesLoading } =
        useEnabledCommunities();

    useEffect(() => {
        if (!profile || enabledCommunitiesLoading) {
            return;
        }

        if (!hasEnabledCommunities) {
            setPosts([]);
            setTotalPosts(0);
            setCommunities([]);
            setLoading(false);
            router.replace("/dashboard/my-content/products");
            return;
        }

        let cancelled = false;

        const loadFeed = async () => {
            const feedQuery = `
                query ($page: Int!, $limit: Int!) {
                    feed: getFeed(page: $page, limit: $limit) {
                        communityId
                        postId
                        title
                        content
                        category
                        media {
                            type
                            title
                            url
                            media {
                                mediaId
                                file
                                thumbnail
                                originalFileName
                                size
                            }
                        }
                        likesCount
                        reactions {
                            emoji
                            count
                            hasReacted
                            reactors {
                                userId
                                name
                                avatar {
                                    mediaId
                                    file
                                    thumbnail
                                }
                            }
                        }
                        commentsCount
                        updatedAt
                        hasLiked
                        user {
                            userId
                            name
                            email
                            avatar {
                                mediaId
                                file
                                thumbnail
                            }
                        }
                        pinned
                        community {
                            id
                            title
                        }
                    }
                    totalFeedPosts: getFeedCount
                    content: getUserContent {
                        entityType
                        entity {
                            id
                            title
                            slug
                            membersCount
                        }
                    }
                }
            `;

            try {
                setLoading(true);
                const fetch = new FetchBuilder()
                    .setUrl(`${address.backend}/api/graph`)
                    .setPayload({
                        query: feedQuery,
                        variables: {
                            page,
                            limit: POSTS_PER_PAGE,
                        },
                    })
                    .setIsGraphQLEndpoint(true)
                    .build();

                const response = await fetch.exec();
                if (cancelled) {
                    return;
                }

                setPosts(response.feed || []);
                setTotalPosts(response.totalFeedPosts || 0);
                setCommunities(
                    ((response.content as UserContentItem[] | undefined) || [])
                        .filter(
                            (item) =>
                                item.entityType.toLowerCase() ===
                                Constants.MembershipEntityType.COMMUNITY,
                        )
                        .map((item) => item.entity),
                );
            } catch (e: any) {
                if (cancelled) {
                    return;
                }

                setPosts([]);
                setTotalPosts(0);
                setCommunities([]);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadFeed();

        return () => {
            cancelled = true;
        };
    }, [
        address.backend,
        hasEnabledCommunities,
        enabledCommunitiesLoading,
        page,
        profile,
        router,
    ]);

    const formatTimestamp = (value?: string) => formattedLocaleDate(value);

    const handleReact = useCallback(
        async (
            communityId: string,
            postId: string,
            emoji: string,
            e?: React.MouseEvent,
        ) => {
            e?.stopPropagation();

            const query = `
                mutation ($communityId: String!, $postId: String!, $emoji: String!) {
                    togglePostReaction(communityId: $communityId, postId: $postId, emoji: $emoji) {
                        postId
                        reactions {
                            emoji
                            count
                            hasReacted
                            reactors {
                                userId
                                name
                                avatar {
                                    mediaId
                                    file
                                    thumbnail
                                }
                            }
                        }
                    }
                }
            `;
            try {
                const fetch = new FetchBuilder()
                    .setUrl(`${address.backend}/api/graph`)
                    .setPayload({
                        query,
                        variables: { postId, communityId, emoji },
                    })
                    .setIsGraphQLEndpoint(true)
                    .build();
                const response = await fetch.exec();
                if (response.togglePostReaction) {
                    setPosts((prevPosts) =>
                        prevPosts.map((p) =>
                            p.postId === postId
                                ? {
                                      ...p,
                                      reactions:
                                          response.togglePostReaction.reactions,
                                  }
                                : p,
                        ),
                    );
                }
            } catch (err: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: err.message,
                });
            }
        },
        [address.backend, toast],
    );

    const communitiesPanel = (
        <Card className="h-fit">
            <CardHeader>
                <CardTitle>{MY_CONTENT_FEED_COMMUNITIES_TITLE}</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
                {communities.length ? (
                    <ul className="min-w-0 space-y-3">
                        {communities.map((community) => (
                            <li key={community.id} className="min-w-0">
                                <Link
                                    href={`/dashboard/community/${community.id}`}
                                    className="block min-w-0 truncate text-sm text-foreground transition-colors hover:text-primary"
                                    title={community.title}
                                >
                                    {community.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="rounded-lg border border-dashed px-4 py-6 text-center">
                        <div className="mb-3 flex justify-center">
                            <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {MY_CONTENT_FEED_COMMUNITIES_EMPTY}
                        </p>
                        <Button asChild className="mt-4" size="sm">
                            <Link href="/communities">
                                {MY_CONTENT_BROWSE_COMMUNITIES}
                            </Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const showCommunitiesPanel = communities.length > 0;

    const renderMediaPreview = (media: CommunityMedia) => {
        if (!media) return null;

        switch (media.type) {
            case "image":
                return media.media ? (
                    <Image
                        src={media.media.thumbnail}
                        alt="Post media"
                        className="h-48 w-48 rounded-md object-cover"
                        width={192}
                        height={192}
                    />
                ) : null;
            case "gif":
                return (
                    <img
                        src={media.url}
                        alt="GIF"
                        className="h-48 w-48 rounded-md object-cover"
                    />
                );
            case "video":
                return media.media ? (
                    <video
                        src={media.media.file}
                        poster={media.media.thumbnail}
                        className="h-48 aspect-video rounded-md object-cover"
                        controls
                        controlsList="nodownload"
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        Your browser does not support the video tag.
                    </video>
                ) : null;
            case "youtube": {
                const videoId = extractVideoId(media.url, "youtube");

                if (!videoId) {
                    return null;
                }

                return (
                    <div className="relative aspect-video w-full">
                        <img
                            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                            alt="YouTube thumbnail"
                            className="h-full w-full rounded-md object-cover"
                        />
                    </div>
                );
            }
            case "pdf":
                return (
                    <div className="flex h-48 w-36 flex-col justify-between rounded bg-red-500">
                        <div>
                            <div className="ml-1 mt-1 inline-block rounded bg-gray-900 p-1 text-xs text-white">
                                PDF
                            </div>
                        </div>
                        <div className="truncate p-1 text-sm text-white">
                            {media.media?.originalFileName}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    if (enabledCommunitiesLoading) {
        return null;
    }

    if (loading) {
        return <FeedLoadingSkeleton />;
    }

    if (!hasEnabledCommunities) {
        return null;
    }

    if (!posts.length) {
        if (!showCommunitiesPanel) {
            return (
                <AdminEmptyState
                    title={MY_CONTENT_FEED_EMPTY_TITLE}
                    description={MY_CONTENT_FEED_EMPTY_DESCRIPTION}
                    actionLabel={MY_CONTENT_BROWSE_COMMUNITIES}
                    actionHref="/communities"
                />
            );
        }

        return (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0">
                    <AdminEmptyState
                        title={MY_CONTENT_FEED_EMPTY_TITLE}
                        description={MY_CONTENT_FEED_EMPTY_DESCRIPTION}
                        actionLabel={MY_CONTENT_BROWSE_COMMUNITIES}
                        actionHref="/communities"
                    />
                </div>
                <div className="order-last lg:order-none lg:min-w-0">
                    {communitiesPanel}
                </div>
            </div>
        );
    }

    if (!showCommunitiesPanel) {
        return (
            <PaginatedTable
                className="min-w-0"
                page={page}
                totalPages={Math.ceil(totalPosts / POSTS_PER_PAGE)}
                onPageChange={setPage}
            >
                <div className="flex flex-col gap-4">
                    {posts.map((post) => (
                        <CommunityPostCard
                            key={`${post.community.id}:${post.postId}`}
                            post={post}
                            communityName={post.community.title}
                            communityId={post.community.id}
                            formatTimestamp={formatTimestamp}
                            renderMediaPreview={renderMediaPreview}
                            onOpen={(postId) =>
                                router.push(
                                    communityPostHref(
                                        post.community.id,
                                        postId,
                                    ),
                                )
                            }
                            onReply={(postId) =>
                                router.push(
                                    communityPostHref(
                                        post.community.id,
                                        postId,
                                        { reply: true },
                                    ),
                                )
                            }
                            onReact={(postId, emoji, e) =>
                                handleReact(post.community.id, postId, emoji, e)
                            }
                        />
                    ))}
                </div>
            </PaginatedTable>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <PaginatedTable
                className="min-w-0"
                page={page}
                totalPages={Math.ceil(totalPosts / POSTS_PER_PAGE)}
                onPageChange={setPage}
            >
                <div className="flex flex-col gap-4">
                    {posts.map((post) => (
                        <CommunityPostCard
                            key={`${post.community.id}:${post.postId}`}
                            post={post}
                            communityName={post.community.title}
                            communityId={post.community.id}
                            formatTimestamp={formatTimestamp}
                            renderMediaPreview={renderMediaPreview}
                            onOpen={(postId) =>
                                router.push(
                                    communityPostHref(
                                        post.community.id,
                                        postId,
                                    ),
                                )
                            }
                            onReply={(postId) =>
                                router.push(
                                    communityPostHref(
                                        post.community.id,
                                        postId,
                                        { reply: true },
                                    ),
                                )
                            }
                            onReact={(postId, emoji, e) =>
                                handleReact(post.community.id, postId, emoji, e)
                            }
                        />
                    ))}
                </div>
            </PaginatedTable>
            <div className="order-last lg:order-none lg:min-w-0">
                {communitiesPanel}
            </div>
        </div>
    );
}
