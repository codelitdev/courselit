"use client";

import { useContext, useEffect, useState, use } from "react";
import { FetchBuilder } from "@courselit/utils";
import {
    AddressContext,
    ProfileContext,
    ThemeContext,
} from "@components/contexts";
import { getProduct, CourseFrontend } from "../helpers";
import { getUserProfile } from "@/app/(with-contexts)/helpers";
import { MessageSquare, ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import {
    Button,
    PageCard,
    PageCardContent,
    Header1,
    Header4,
    Text2,
} from "@courselit/page-primitives";
import { redirect } from "next/navigation";
import {
    COURSE_DISCUSSIONS_NAV_LABEL,
    COURSE_DISCUSSIONS_STREAM_EMPTY_TITLE,
    COURSE_DISCUSSIONS_STREAM_EMPTY_DESCRIPTION,
    COURSE_DISCUSSIONS_STREAM_PREVIOUS,
    COURSE_DISCUSSIONS_STREAM_NEXT,
    COURSE_DISCUSSIONS_STREAM_PAGE_LABEL,
    COURSE_DISCUSSIONS_STREAM_PAGE_OF,
} from "@ui-config/strings";

interface Post {
    postId: string;
    communityId: string;
    title: string;
    content: any;
    likesCount: number;
    commentsCount: number;
    updatedAt: string;
    lessonId?: string;
    user?: {
        name: string;
        avatar?: {
            file?: string;
        };
    };
}

export default function DiscussionsStreamPage(props: {
    params: Promise<{ slug: string; id: string }>;
}) {
    const params = use(props.params);
    const { slug, id } = params;
    const [product, setProduct] = useState<CourseFrontend | null>(null);
    const { profile, setProfile } = useContext(ProfileContext);
    const address = useContext(AddressContext);
    const { theme } = useContext(ThemeContext);

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    useEffect(() => {
        if (id) {
            getProduct(id, address.backend).then((prod) => {
                setProduct(prod);
            });
        }
    }, [id]);

    useEffect(() => {
        if (product) {
            getUserProfile(address.backend).then((prof) => {
                setProfile(prof);
            });
        }
    }, [product]);

    const loadStream = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const query = `
                query GetCourseDiscussionStream($courseId: String!, $page: Int!, $limit: Int!) {
                    stream: getCourseDiscussionStream(courseId: $courseId, page: $page, limit: $limit) {
                        postId
                        communityId
                        title
                        content
                        likesCount
                        commentsCount
                        lessonId
                        updatedAt
                    }
                    count: getCourseDiscussionStreamCount(courseId: $courseId)
                }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: { courseId: id, page, limit },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetch.exec();
            if (response?.stream) {
                setPosts(response.stream);
            }
            if (response?.count !== undefined) {
                setTotalPages(Math.max(1, Math.ceil(response.count / limit)));
            }
        } catch (err) {
            console.error("Error loading stream:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (product) {
            loadStream();
        }
    }, [product, page]);

    if (!profile) {
        return null;
    }

    if (product && !product.discussions) {
        redirect(`/course/${slug}/${id}`);
    }

    return (
        <div className="flex flex-col pb-[100px] lg:max-w-[40rem] xl:max-w-[48rem] mx-auto text-foreground">
            {/* Header section */}
            <div className="mb-8 space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <BookOpen className="h-4 w-4" />
                    <Text2
                        theme={theme.theme}
                        className="font-semibold text-sm text-primary"
                    >
                        {product?.title}
                    </Text2>
                </div>
                <Header1 theme={theme.theme} className="tracking-tight">
                    {COURSE_DISCUSSIONS_NAV_LABEL}
                </Header1>
            </div>

            {/* Stream feed */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((n) => (
                        <PageCard
                            key={n}
                            theme={theme.theme}
                            className="p-4 flex items-center justify-between gap-4"
                        >
                            <div className="h-6 w-2/3 animate-pulse bg-muted" />
                            <div className="h-4 w-10 animate-pulse bg-muted" />
                        </PageCard>
                    ))}
                </div>
            ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border rounded-xl bg-card">
                    <div className="p-4 rounded-full bg-primary/10 text-primary animate-in fade-in zoom-in duration-300">
                        <MessageSquare className="h-8 w-8" />
                    </div>
                    <div className="space-y-1 max-w-sm mx-auto">
                        <Header4
                            theme={theme.theme}
                            className="font-semibold text-lg mb-1"
                        >
                            {COURSE_DISCUSSIONS_STREAM_EMPTY_TITLE}
                        </Header4>
                        <Text2 theme={theme.theme}>
                            {COURSE_DISCUSSIONS_STREAM_EMPTY_DESCRIPTION}
                        </Text2>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {posts.map((post) => {
                        const lessonId = post.lessonId || product?.firstLesson;
                        return (
                            <PageCard
                                key={post.postId}
                                theme={theme.theme}
                                isLink={true}
                                onClick={() => {
                                    if (lessonId) {
                                        window.location.href = `/course/${slug}/${id}/${lessonId}?discussion=open`;
                                    }
                                }}
                            >
                                <PageCardContent
                                    theme={theme.theme}
                                    className="p-4 flex items-center justify-between gap-4"
                                >
                                    <Header4
                                        theme={theme.theme}
                                        className="font-semibold text-base flex-1"
                                    >
                                        {post.title}
                                    </Header4>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        <span>{post.commentsCount}</span>
                                    </div>
                                </PageCardContent>
                            </PageCard>
                        );
                    })}

                    {/* Pagination controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-8 pt-4 border-t">
                            <Button
                                theme={theme.theme}
                                variant="outline"
                                onClick={() =>
                                    setPage((p) => Math.max(1, p - 1))
                                }
                                disabled={page === 1}
                                className="flex gap-1.5 items-center"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {COURSE_DISCUSSIONS_STREAM_PREVIOUS}
                            </Button>
                            <span className="text-xs font-medium text-muted-foreground">
                                {COURSE_DISCUSSIONS_STREAM_PAGE_LABEL} {page}{" "}
                                {COURSE_DISCUSSIONS_STREAM_PAGE_OF} {totalPages}
                            </span>
                            <Button
                                theme={theme.theme}
                                variant="outline"
                                onClick={() =>
                                    setPage((p) => Math.min(totalPages, p + 1))
                                }
                                disabled={page === totalPages}
                                className="flex gap-1.5 items-center"
                            >
                                {COURSE_DISCUSSIONS_STREAM_NEXT}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
