"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@courselit/components-library";
import { COURSE_TYPE_COURSE } from "@ui-config/constants";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import {
    COURSE_SETTINGS_DISCUSSIONS_TITLE,
    COURSE_SETTINGS_DISCUSSIONS_DESCRIPTION,
    COURSE_SETTINGS_DISCUSSIONS_LINK,
    COURSE_SETTINGS_DISCUSSIONS_LINKED_COMMUNITY_TITLE,
    COURSE_SETTINGS_DISCUSSIONS_LINKED_COMMUNITY_DESCRIPTION,
    TOAST_TITLE_SUCCESS,
    TOAST_TITLE_ERROR,
    APP_MESSAGE_COURSE_SAVED,
} from "@ui-config/strings";
import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";

const MUTATION_UPDATE_DISCUSSIONS = `
    mutation UpdateDiscussions($courseId: String!, $discussions: Boolean!) {
        updateCourse(courseData: { id: $courseId, discussions: $discussions }) {
            courseId
            discussions
            discussionCommunityId
        }
    }
`;

interface DiscussionsProps {
    product: any;
}

export default function Discussions({ product }: DiscussionsProps) {
    const { toast } = useToast();
    const fetch = useGraphQLFetch();
    const [loading, setLoading] = useState(false);
    const [discussions, setDiscussions] = useState(
        product?.discussions || false,
    );
    const [discussionCommunityId, setDiscussionCommunityId] = useState(
        product?.discussionCommunityId || null,
    );

    useEffect(() => {
        if (product) {
            setDiscussions(product.discussions || false);
            setDiscussionCommunityId(product.discussionCommunityId || null);
        }
    }, [product]);

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
                setDiscussionCommunityId(
                    response.updateCourse.discussionCommunityId,
                );
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
            <div className="space-y-6" id="discussions">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base font-semibold">
                            {COURSE_SETTINGS_DISCUSSIONS_TITLE}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {COURSE_SETTINGS_DISCUSSIONS_DESCRIPTION}
                        </p>
                    </div>
                    <Switch
                        checked={discussions}
                        onCheckedChange={handleDiscussionsChange}
                        disabled={loading}
                    />
                </div>

                {discussions && discussionCommunityId && (
                    <div className="mt-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-full">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">
                                    {
                                        COURSE_SETTINGS_DISCUSSIONS_LINKED_COMMUNITY_TITLE
                                    }
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {
                                        COURSE_SETTINGS_DISCUSSIONS_LINKED_COMMUNITY_DESCRIPTION
                                    }
                                </p>
                            </div>
                        </div>
                        <Link
                            href={`/dashboard/community/${discussionCommunityId}/manage`}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline group"
                        >
                            {COURSE_SETTINGS_DISCUSSIONS_LINK}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                )}
            </div>
            <Separator />
        </div>
    );
}
