"use client";

import { useContext, useEffect, useState, useMemo } from "react";
import type React from "react";
import { useParams } from "next/navigation";
import DashboardContent from "@components/admin/dashboard-content";
import useProduct from "@/hooks/use-product";
import { AddressContext, ThemeContext } from "@components/contexts";
import { FetchBuilder, truncate } from "@courselit/utils";
import {
    COURSE_DISCUSSIONS_ADMIN_NO_DISCUSSIONS,
    COURSE_DISCUSSIONS_ADMIN_NO_DISCUSSIONS_DESCRIPTION,
    COURSE_DISCUSSIONS_ADMIN_OVERVIEW,
    COURSE_DISCUSSIONS_ADMIN_VIEW_REPORTS,
    COURSE_DISCUSSIONS_TITLE,
    COURSE_SETTINGS_CARD_HEADER,
    LOAD_MORE_TEXT,
    MANAGE_COURSES_PAGE_HEADING,
    TOAST_TITLE_ERROR,
} from "@ui-config/strings";
import AdminEmptyState from "@components/admin/empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@courselit/components-library";
import Link from "next/link";
import { FlagTriangleRight, MessageSquare } from "lucide-react";
import { UIConstants } from "@courselit/common-models";

const { permissions } = UIConstants;

type DiscussionSummary = {
    entityId: string;
    totalCount: number;
    commentsCount: number;
    repliesCount: number;
    lastActivityAt: string;
};

export default function ProductDiscussionsManagePage() {
    const params = useParams();
    const productId = params?.id as string;
    const { product } = useProduct(productId);
    const address = useContext(AddressContext);
    const { theme } = useContext(ThemeContext);
    const { toast } = useToast();
    const [summaries, setSummaries] = useState<DiscussionSummary[]>([]);
    const [summaryCursor, setSummaryCursor] = useState<string>();
    const [hasMoreSummaries, setHasMoreSummaries] = useState(false);
    const [loading, setLoading] = useState(false);

    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product/${productId}`,
        },
        {
            label: COURSE_SETTINGS_CARD_HEADER,
            href: `/dashboard/product/${productId}/manage`,
        },
        { label: COURSE_DISCUSSIONS_TITLE, href: "#" },
    ];

    useEffect(() => {
        if (productId && address?.backend) {
            loadSummaries();
        }
    }, [productId, address?.backend]);

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
                    query GetAdminProductDiscussionSummaries($productId: String!, $cursor: String) {
                        summaries: getProductDiscussionSummaries(productId: $productId, admin: true, cursor: $cursor, limit: 20) {
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
                variables: { productId, cursor },
            });
            const page = response.summaries;
            setSummaries((current) =>
                cursor ? [...current, ...page.items] : page.items,
            );
            setSummaryCursor(page.nextCursor);
            setHasMoreSummaries(page.hasMore);
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    const lessonsById = useMemo(() => {
        if (!product?.lessons) return {};
        return Object.fromEntries(
            product.lessons.map((lesson: any) => [
                lesson.lessonId,
                lesson.title,
            ]),
        );
    }, [product]);

    const rows = useMemo(
        () =>
            summaries.map((summary) => ({
                ...summary,
                title: lessonsById[summary.entityId] || summary.entityId,
            })),
        [summaries, lessonsById],
    );

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[
                permissions.manageAnyCourse,
                permissions.manageCourse,
            ]}
        >
            <div className="space-y-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-semibold">
                            {COURSE_DISCUSSIONS_TITLE}
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            {COURSE_DISCUSSIONS_ADMIN_OVERVIEW}
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link
                            href={`/dashboard/product/${productId}/manage/discussions/reports`}
                        >
                            <FlagTriangleRight className="h-4 w-4" />{" "}
                            {COURSE_DISCUSSIONS_ADMIN_VIEW_REPORTS}
                        </Link>
                    </Button>
                </div>

                <section className="space-y-4">
                    {rows.length === 0 ? (
                        <AdminEmptyState
                            title={COURSE_DISCUSSIONS_ADMIN_NO_DISCUSSIONS}
                            description={
                                COURSE_DISCUSSIONS_ADMIN_NO_DISCUSSIONS_DESCRIPTION
                            }
                        />
                    ) : (
                        <div className="space-y-3 w-full">
                            {rows.map((summary) => (
                                <Link
                                    key={summary.entityId}
                                    href={`/dashboard/product/${productId}/manage/discussions/${summary.entityId}`}
                                    className="block p-5 rounded-xl border hover:bg-accent/50 transition-colors flex items-center justify-between gap-4 bg-white border-border"
                                >
                                    <span className="font-semibold text-sm">
                                        {summary.title}
                                    </span>
                                    <span className="flex items-center gap-2 text-muted-foreground text-sm shrink-0">
                                        <MessageSquare className="h-4 w-4" />
                                        {summary.totalCount}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                    {hasMoreSummaries && (
                        <Button
                            variant="secondary"
                            disabled={loading}
                            onClick={() => loadSummaries(summaryCursor)}
                        >
                            {LOAD_MORE_TEXT}
                        </Button>
                    )}
                </section>
            </div>
        </DashboardContent>
    );
}
