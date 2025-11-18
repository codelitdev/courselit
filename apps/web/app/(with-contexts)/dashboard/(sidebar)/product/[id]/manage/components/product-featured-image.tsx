"use client";

import { useContext, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { MediaSelector, useToast } from "@courselit/components-library";
import { Media, Profile } from "@courselit/common-models";
import { AddressContext, ProfileContext } from "@components/contexts";
import { MIMETYPE_IMAGE } from "@ui-config/constants";
import {
    APP_MESSAGE_COURSE_SAVED,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";

const MUTATION_UPDATE_FEATURED_IMAGE = `
    mutation UpdateFeaturedImage($courseId: String!, $media: MediaInput) {
        updateCourse(courseData: {
            id: $courseId
            featuredImage: $media
        }) {
            courseId
        }
    }
`;

interface ProductFeaturedImageProps {
    product: any;
}

export default function ProductFeaturedImage({
    product,
}: ProductFeaturedImageProps) {
    const { toast } = useToast();
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);
    const fetch = useGraphQLFetch();
    const [loading, setLoading] = useState(false);
    const [featuredImage, setFeaturedImage] = useState<any>(
        product?.featuredImage || {},
    );

    const saveFeaturedImage = async (media?: Media) => {
        if (!product?.courseId) return;

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: MUTATION_UPDATE_FEATURED_IMAGE,
                    variables: {
                        courseId: product.courseId,
                        media: media || null,
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
            <div className="space-y-4">
                <h2 className="text-base font-semibold">Featured image</h2>
                <p className="text-sm text-muted-foreground">
                    The hero image for your course
                </p>
                <MediaSelector
                    title=""
                    src={(featuredImage && featuredImage.thumbnail) || ""}
                    srcTitle={
                        (featuredImage && featuredImage.originalFileName) || ""
                    }
                    onSelection={(media?: Media) => {
                        if (media) {
                            setFeaturedImage(media);
                        }
                        saveFeaturedImage(media);
                    }}
                    mimeTypesToShow={[...MIMETYPE_IMAGE]}
                    access="public"
                    strings={{}}
                    profile={profile as unknown as Profile}
                    address={address}
                    mediaId={(featuredImage && featuredImage.mediaId) || ""}
                    onRemove={() => {
                        setFeaturedImage({});
                        saveFeaturedImage();
                    }}
                    type="course"
                    disabled={loading}
                />
            </div>
            <Separator />
        </div>
    );
}
