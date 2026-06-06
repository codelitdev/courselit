"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@courselit/components-library";
import {
    APP_MESSAGE_COURSE_SAVED,
    COURSE_DISCUSSIONS_DESCRIPTION,
    COURSE_DISCUSSIONS_MANAGE_DISCUSSION,
    COURSE_DISCUSSIONS_TITLE,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { COURSE_TYPE_COURSE } from "@ui-config/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const MUTATION_UPDATE_DISCUSSIONS = `
    mutation UpdateDiscussions($courseId: String!, $discussions: Boolean!) {
        updateCourse(courseData: { id: $courseId, discussions: $discussions }) {
            courseId
            discussions
        }
    }
`;

interface ProductDiscussionsProps {
    product: any;
}

export default function ProductDiscussions({
    product,
}: ProductDiscussionsProps) {
    const { toast } = useToast();
    const fetch = useGraphQLFetch();
    const [loading, setLoading] = useState(false);
    const [discussions, setDiscussions] = useState(
        product?.discussions || false,
    );

    const handleDiscussionsChange = async () => {
        const newValue = !discussions;
        const previousValue = discussions;
        setDiscussions(newValue);

        if (!product?.courseId) return;

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: MUTATION_UPDATE_DISCUSSIONS,
                    variables: {
                        courseId: product.courseId,
                        discussions: newValue,
                    },
                })
                .build()
                .exec();

            if (response?.updateCourse) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_COURSE_SAVED,
                });
            }
        } catch (err: any) {
            setDiscussions(previousValue);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (product?.type?.toLowerCase() !== COURSE_TYPE_COURSE) {
        return null;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="text-base font-semibold">
                        {COURSE_DISCUSSIONS_TITLE}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {COURSE_DISCUSSIONS_DESCRIPTION}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Switch
                        checked={discussions}
                        onCheckedChange={handleDiscussionsChange}
                        disabled={loading}
                    />
                </div>
            </div>
            {discussions && (
                <div className="flex items-center gap-4 mt-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link
                            href={`/dashboard/product/${product.courseId}/manage/discussions`}
                        >
                            {COURSE_DISCUSSIONS_MANAGE_DISCUSSION}
                        </Link>
                    </Button>
                </div>
            )}
            <Separator />
        </div>
    );
}
