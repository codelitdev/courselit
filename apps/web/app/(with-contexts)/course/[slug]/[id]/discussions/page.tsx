"use client";

import { useContext, useEffect, useMemo, useState, use } from "react";
import { AddressContext, ThemeContext } from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";
import { getProduct } from "../helpers";
import {
    Button,
    Header1,
    PageCard,
    PageCardContent,
    Text1,
    Text2,
} from "@courselit/page-primitives";
import {
    COURSE_DISCUSSIONS_EMPTY,
    COURSE_DISCUSSIONS_TITLE,
    LOAD_MORE_TEXT,
} from "@ui-config/strings";
import { BookOpen, MessageSquare } from "lucide-react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import {
    appendCourseViewerSessionParamsToHref,
    getCourseViewerSessionParams,
} from "@/lib/course-viewer-session-params";

type DiscussionSummary = {
    entityId: string;
    totalCount: number;
    commentsCount: number;
    repliesCount: number;
    lastActivityAt: string;
};

export default function CourseDiscussionsPage(props: {
    params: Promise<{ slug: string; id: string }>;
}) {
    const params = use(props.params);
    const { slug, id } = params;
    const address = useContext(AddressContext);
    const { theme } = useContext(ThemeContext);
    const searchParams = useSearchParams();
    const viewerSessionParams = getCourseViewerSessionParams(searchParams);
    const [summaries, setSummaries] = useState<DiscussionSummary[]>([]);
    const [courseTitle, setCourseTitle] = useState<string>("");
    const [nextCursor, setNextCursor] = useState<string>();
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lessonsById, setLessonsById] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!id || !address?.backend) return;
        getProduct(
            id,
            address.backend,
            Boolean(viewerSessionParams.preview),
        ).then((product) => {
            setCourseTitle(product.title || "");
            const lessons = Object.fromEntries(
                product.groups
                    .flatMap((group) => group.lessons)
                    .map((lesson) => [lesson.lessonId, lesson.title]),
            );
            setLessonsById(lessons);
        });
        loadSummaries();
    }, [id, address?.backend, viewerSessionParams.preview]);

    const rows = useMemo(
        () =>
            summaries.map((summary) => ({
                ...summary,
                title: lessonsById[summary.entityId] || summary.entityId,
            })),
        [summaries, lessonsById],
    );

    async function graph(payload: Record<string, unknown>) {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(payload)
            .setIsGraphQLEndpoint(true)
            .build();

        return await fetch.exec();
    }

    async function loadSummaries(cursor?: string) {
        setLoading(true);
        try {
            const response = await graph({
                query: `
                    query GetProductDiscussionSummaries($productId: String!, $cursor: String) {
                        summaries: getProductDiscussionSummaries(productId: $productId, cursor: $cursor, limit: 20) {
                            items {
                                entityId
                                totalCount
                                commentsCount
                                repliesCount
                                lastActivityAt
                            }
                            nextCursor
                            hasMore
                        }
                    }
                `,
                variables: {
                    productId: id,
                    cursor,
                },
            });

            const page = response.summaries;
            setSummaries((current) =>
                cursor ? [...current, ...page.items] : page.items,
            );
            setNextCursor(page.nextCursor);
            setHasMore(page.hasMore);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex w-full min-h-[calc(100vh-4rem)] text-foreground relative min-w-0">
            <div className="flex-grow min-w-0 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-4rem)]">
                <div className="flex flex-col pb-[100px] lg:max-w-[40rem] xl:max-w-[48rem] mx-auto w-full px-4 pt-4 gap-6">
                    <div className="flex flex-col gap-1">
                        {courseTitle && (
                            <NextLink
                                href={appendCourseViewerSessionParamsToHref(
                                    `/course/${slug}/${id}`,
                                    viewerSessionParams,
                                )}
                                className="flex items-center gap-2 text-sm text-muted-foreground font-semibold hover:text-foreground transition-colors w-fit mb-1"
                            >
                                <BookOpen className="h-4 w-4 shrink-0" />
                                <span>{courseTitle}</span>
                            </NextLink>
                        )}
                        <Header1
                            theme={theme.theme}
                            className="max-w-full break-all"
                        >
                            {COURSE_DISCUSSIONS_TITLE}
                        </Header1>
                    </div>
                    {!loading && rows.length === 0 && (
                        <Text1 theme={theme.theme}>
                            {COURSE_DISCUSSIONS_EMPTY}
                        </Text1>
                    )}
                    <div className="space-y-3">
                        {rows.map((summary) => (
                            <NextLink
                                key={summary.entityId}
                                href={appendCourseViewerSessionParamsToHref(
                                    `/course/${slug}/${id}/${summary.entityId}?discussion=open`,
                                    viewerSessionParams,
                                )}
                                className="block"
                            >
                                <PageCard theme={theme.theme} isLink>
                                    <PageCardContent
                                        theme={theme.theme}
                                        className="flex items-center justify-between gap-4"
                                    >
                                        <Text1
                                            theme={theme.theme}
                                            className="font-semibold"
                                        >
                                            {summary.title}
                                        </Text1>
                                        <Text2
                                            theme={theme.theme}
                                            className="flex items-center gap-2"
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                            {summary.totalCount}
                                        </Text2>
                                    </PageCardContent>
                                </PageCard>
                            </NextLink>
                        ))}
                    </div>
                    {hasMore && (
                        <Button
                            theme={theme.theme}
                            variant="secondary"
                            disabled={loading}
                            onClick={() => loadSummaries(nextCursor)}
                        >
                            {LOAD_MORE_TEXT}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
