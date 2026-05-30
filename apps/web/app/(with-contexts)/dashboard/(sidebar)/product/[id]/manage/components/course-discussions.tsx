"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@courselit/components-library";
import {
    APP_MESSAGE_COURSE_SAVED,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { responses } from "@/config/strings";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";

const MUTATION_UPDATE_DISCUSSIONS = `
    mutation UpdateDiscussions($courseId: String!, $discussions: Boolean!) {
        updateCourse(courseData: { id: $courseId, discussions: $discussions }) {
            courseId
        }
    }
`;

interface CourseDiscussionsProps {
    product: any;
}

export default function CourseDiscussions({ product }: CourseDiscussionsProps) {
    const { toast } = useToast();
    const fetch = useGraphQLFetch();
    const [loading, setLoading] = useState(false);
    const [discussionsEnabled, setDiscussionsEnabled] = useState(
        product?.discussions || false,
    );

    const handleDiscussionsChange = async () => {
        const newValue = !discussionsEnabled;
        const previousValue = discussionsEnabled;
        setDiscussionsEnabled(newValue);

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
                    description: newValue
                        ? responses.discussions_enabled
                        : responses.discussions_disabled,
                });
            }
        } catch (err: any) {
            setDiscussionsEnabled(previousValue);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-6" id="discussions">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base font-semibold">
                            {responses.discussions_toggle_label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {responses.discussions_toggle_description}
                        </p>
                    </div>
                    <Switch
                        checked={discussionsEnabled}
                        onCheckedChange={handleDiscussionsChange}
                        disabled={loading}
                    />
                </div>
            </div>
            <Separator />
        </div>
    );
}
