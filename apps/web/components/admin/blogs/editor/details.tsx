import React, { FormEvent, useContext, useEffect, useState } from "react";
import {
    MediaSelector,
    Form,
    FormField,
    Button,
    PageBuilderPropertyHeader,
    useToast,
} from "@courselit/components-library";
import useCourse from "./course-hook";
import { FetchBuilder } from "@courselit/utils";
import {
    APP_MESSAGE_COURSE_SAVED,
    BUTTON_SAVE,
    COURSE_CONTENT_HEADER,
    TOAST_TITLE_ERROR,
    FORM_FIELD_FEATURED_IMAGE,
    TOAST_TITLE_SUCCESS,
    TEXT_EDITOR_PLACEHOLDER,
} from "@/ui-config/strings";
import { MIMETYPE_IMAGE } from "@/ui-config/constants";
import { Media, Profile } from "@courselit/common-models";
import { AddressContext, ProfileContext } from "@components/contexts";
import { Editor, emptyDoc as TextEditorEmptyDoc } from "@courselit/text-editor";

interface DetailsProps {
    id: string;
}

export default function Details({ id }: DetailsProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState(TextEditorEmptyDoc);
    const [featuredImage, setFeaturedImage] = useState<Partial<Media>>({});
    const [refreshDetails, setRefreshDetails] = useState(0);
    const [loading, setLoading] = useState(false);
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);
    const course = useCourse(id);
    const { toast } = useToast();

    useEffect(() => {
        if (course) {
            setTitle(course.title || "");
            setDescription(
                course.description
                    ? JSON.parse(course.description)
                    : TextEditorEmptyDoc,
            );
            setFeaturedImage(course.featuredImage || {});
            setRefreshDetails(refreshDetails + 1);
        }
    }, [course]);

    const updateDetails = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const mutation = `
            mutation ($courseId: String!, $title: String!, $description: String) {
                updateCourse(courseData: {
                    id: $courseId
                    title: $title
                    description: $description
                }) {
                    courseId 
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    courseId: course!.courseId,
                    title: title,
                    description: JSON.stringify(description),
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setLoading(true);
            await fetch.exec();
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

    const saveFeaturedImage = async (media?: Media) => {
        const mutation = `
            mutation ($courseId: String!, $media: MediaInput) {
                updateCourse(courseData: {
                    id: $courseId
                    featuredImage: $media
                }) {
                    courseId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    courseId: course?.courseId,
                    media: media || null,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setLoading(true);
            const response = await fetch.exec();
            if (response.updateCourse) {
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
        <div className="flex flex-col gap-4">
            <Form onSubmit={updateDetails} className="flex flex-col gap-4">
                <FormField
                    required
                    label="Title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <PageBuilderPropertyHeader label={COURSE_CONTENT_HEADER} />
                <Editor
                    initialContent={description}
                    refresh={refreshDetails}
                    onChange={(state: any) => setDescription(state)}
                    url={address.backend}
                    placeholder={TEXT_EDITOR_PLACEHOLDER}
                    onError={(err: any) => {
                        toast({
                            title: TOAST_TITLE_ERROR,
                            description: err,
                            variant: "destructive",
                        });
                    }}
                />
                <div>
                    <Button type="submit" disabled={loading}>
                        {BUTTON_SAVE}
                    </Button>
                </div>
            </Form>
            <hr />
            <MediaSelector
                title={FORM_FIELD_FEATURED_IMAGE}
                src={(featuredImage && featuredImage.thumbnail) || ""}
                srcTitle={
                    (featuredImage && featuredImage.originalFileName) || ""
                }
                onSelection={(media?: Media) => {
                    media && setFeaturedImage(media);
                    saveFeaturedImage(media);
                }}
                mimeTypesToShow={[...MIMETYPE_IMAGE]}
                access="public"
                strings={{}}
                profile={profile as Profile}
                address={address}
                mediaId={(featuredImage && featuredImage.mediaId) || ""}
                onRemove={() => {
                    setFeaturedImage({});
                    saveFeaturedImage();
                }}
                type="course"
            />
        </div>
    );
}
