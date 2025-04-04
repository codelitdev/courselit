import React, { FormEvent, useEffect, useState } from "react";
import {
    MediaSelector,
    TextEditor,
    TextEditorEmptyDoc,
    Button,
    Form,
    FormField,
    PageBuilderPropertyHeader,
    useToast,
} from "@courselit/components-library";
import useCourse from "./course-hook";
import { FetchBuilder } from "@courselit/utils";
import { networkAction } from "@courselit/state-management/dist/action-creators";
import { Address, Media, Profile } from "@courselit/common-models";
import {
    APP_MESSAGE_COURSE_SAVED,
    BUTTON_SAVE,
    COURSE_CONTENT_HEADER,
    TOAST_TITLE_ERROR,
    FORM_FIELD_FEATURED_IMAGE,
    TOAST_TITLE_SUCCESS,
} from "../../../../ui-config/strings";
import { AppDispatch } from "@courselit/state-management";
import { MIMETYPE_IMAGE } from "../../../../ui-config/constants";

interface DetailsProps {
    id: string;
    profile: Profile;
    address: Address;
    dispatch?: AppDispatch;
}

export default function Details({
    id,
    address,
    dispatch,
    profile,
}: DetailsProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState(TextEditorEmptyDoc);
    const [featuredImage, setFeaturedImage] = useState<Partial<Media>>({});
    const [refresh, setRefresh] = useState(0);
    const course = useCourse(id, address, dispatch);
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
            setRefresh(refresh + 1);
        }
    }, [course]);

    const updateDetails = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const mutation = `
            mutation {
                updateCourse(courseData: {
                    id: "${course!.courseId}",
                    title: "${title}",
                    description: ${JSON.stringify(JSON.stringify(description))}
                }) {
                    courseId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch && dispatch(networkAction(true));
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
            dispatch && dispatch(networkAction(false));
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
            dispatch && dispatch(networkAction(true));
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
            dispatch && dispatch(networkAction(false));
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
                <TextEditor
                    initialContent={description}
                    onChange={(state: any) => {
                        setDescription(state);
                    }}
                    refresh={refresh}
                    url={address.backend}
                />
                <div>
                    <Button type="submit">{BUTTON_SAVE}</Button>
                </div>
            </Form>
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
                profile={profile}
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
