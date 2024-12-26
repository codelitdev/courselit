import React, { FormEvent, useEffect, useState } from "react";
import { Form, Button, useToast } from "@courselit/components-library";
import useCourse from "./course-hook";
import { capitalize, FetchBuilder } from "@courselit/utils";
import { Address } from "@courselit/common-models";
import {
    BTN_PUBLISH,
    BTN_UNPUBLISH,
    ERROR_SNACKBAR_PREFIX,
    PUBLISH_TAB_STATUS_SUBTITLE,
    PUBLISH_TAB_STATUS_TITLE,
    PUBLISH_TAB_VISIBILITY_SUBTITLE,
    PUBLISH_TAB_VISIBILITY_TITLE,
} from "../../../../ui-config/strings";
import { AppDispatch } from "@courselit/state-management";

interface PublishProps {
    id: string;
    address: Address;
    dispatch?: AppDispatch;
}

export default function Publish({ id, address, dispatch }: PublishProps) {
    let course = useCourse(id, address);
    const [published, setPublished] = useState(course?.published);
    const [privacy, setPrivacy] = useState<string>(course?.privacy as string);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (course) {
            setPublished(course.published);
            setPrivacy(course.privacy as string);
        }
    }, [course]);

    const updatePublishingDetails = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
    };

    const togglePublishedStatus = async () => {
        const query = `
            mutation {
                course: updateCourse(courseData: {
                id: "${course!.id}"
                published: ${!published}
                }) {
                id,
                published
                }
            }
        `;
        const response = await saveSettings(query);
        setPublished(response.published);
    };

    const toggleVisibility = async () => {
        const query = `
        mutation {
            course: updateCourse(courseData: {
            id: "${course!.id}"
            privacy: ${privacy === "UNLISTED" ? "PUBLIC" : "UNLISTED"}
            }) {
            id,
            privacy 
            }
        }
        `;
        const response = await saveSettings(query);
        setPrivacy(response.privacy);
    };

    const saveSettings = async (mutation: string) => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setLoading(true);
            const response = await fetch.exec();
            if (response.course) {
                return response.course;
            }
        } catch (err: any) {
            toast({
                title: ERROR_SNACKBAR_PREFIX,
                description: err.message,
            });
        } finally {
            setLoading(false);
        }
    };

    if (!course) {
        return <></>;
    }

    return (
        <Form
            onSubmit={updatePublishingDetails}
            className="flex flex-col gap-4"
        >
            <div className="flex justify-between items-center">
                <div>
                    <h2>{PUBLISH_TAB_STATUS_TITLE}</h2>
                    <p className="text-sm text-slate-400">
                        {PUBLISH_TAB_STATUS_SUBTITLE}
                    </p>
                </div>
                <Button
                    onClick={togglePublishedStatus}
                    variant="soft"
                    disabled={loading}
                >
                    {published ? BTN_UNPUBLISH : BTN_PUBLISH}
                </Button>
            </div>
            <div className="flex justify-between items-center">
                <div>
                    <h2>{PUBLISH_TAB_VISIBILITY_TITLE}</h2>
                    <p className="text-sm text-slate-400">
                        {PUBLISH_TAB_VISIBILITY_SUBTITLE}
                    </p>
                </div>
                <Button
                    onClick={toggleVisibility}
                    variant="soft"
                    disabled={loading || !published}
                >
                    {capitalize(privacy)}
                </Button>
            </div>
        </Form>
    );
}
