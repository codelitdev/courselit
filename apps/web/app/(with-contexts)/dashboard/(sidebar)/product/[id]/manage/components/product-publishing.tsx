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
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";

const MUTATION_UPDATE_PUBLISHED = `
    mutation UpdatePublished($courseId: String!, $published: Boolean!) {
        updateCourse(courseData: { id: $courseId, published: $published }) {
            courseId
        }
    }
`;

const MUTATION_UPDATE_PRIVACY = `
    mutation UpdatePrivacy($courseId: String!, $privacy: CoursePrivacyType!) {
        updateCourse(courseData: { id: $courseId, privacy: $privacy }) {
            courseId
        }
    }
`;

interface ProductPublishingProps {
    product: any;
}

export default function ProductPublishing({ product }: ProductPublishingProps) {
    const { toast } = useToast();
    const fetch = useGraphQLFetch();
    const [loading, setLoading] = useState(false);
    const [isPublished, setIsPublished] = useState(product?.published || false);
    const [isPrivate, setIsPrivate] = useState(
        product?.privacy!.toUpperCase() === "UNLISTED" || false,
    );

    const handlePublishedChange = async () => {
        const newValue = !isPublished;
        const previousValue = isPublished;
        setIsPublished(newValue);

        if (!product?.courseId) return;

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: MUTATION_UPDATE_PUBLISHED,
                    variables: {
                        courseId: product.courseId,
                        published: newValue,
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
            // Revert to previous state on error
            setIsPublished(previousValue);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePrivacyChange = async () => {
        const newValue = !isPrivate;
        const previousValue = isPrivate;
        setIsPrivate(newValue);

        if (!product?.courseId) return;

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: MUTATION_UPDATE_PRIVACY,
                    variables: {
                        courseId: product.courseId,
                        privacy: newValue ? "UNLISTED" : "PUBLIC",
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
            // Revert to previous state on error
            setIsPrivate(previousValue);
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
            <div className="space-y-6" id="publish">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base font-semibold">
                            Published
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Make this course available to students
                        </p>
                    </div>
                    <Switch
                        checked={isPublished}
                        onCheckedChange={handlePublishedChange}
                        disabled={loading}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label
                            className={`${!isPublished ? "text-muted-foreground" : ""} text-base font-semibold`}
                        >
                            Visibility
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Only accessible via direct link
                        </p>
                    </div>
                    <Switch
                        checked={isPrivate}
                        onCheckedChange={handlePrivacyChange}
                        disabled={loading || !isPublished}
                    />
                </div>
            </div>
            <Separator />
        </div>
    );
}
