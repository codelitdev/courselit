import React, { FormEvent, useEffect, useState } from "react";
import { Button, Form, useToast } from "@courselit/components-library";
import useCourse from "./course-hook";
import { connect } from "react-redux";
import { capitalize, FetchBuilder } from "@courselit/utils";
import { networkAction } from "@courselit/state-management/dist/action-creators";
import { Address } from "@courselit/common-models";
import {
    BTN_PUBLISH,
    BTN_UNPUBLISH,
    TOAST_TITLE_ERROR,
    PUBLISH_TAB_STATUS_SUBTITLE,
    PUBLISH_TAB_STATUS_TITLE,
    PUBLISH_TAB_VISIBILITY_SUBTITLE,
    PUBLISH_TAB_VISIBILITY_TITLE,
} from "../../../../ui-config/strings";
import { AppDispatch, AppState } from "@courselit/state-management";

interface PublishProps {
    id: string;
    address: Address;
    dispatch?: AppDispatch;
    loading: boolean;
}

export function Publish({ id, address, dispatch, loading }: PublishProps) {
    let course = useCourse(id, address, dispatch);
    const [published, setPublished] = useState(course?.published);
    const [privacy, setPrivacy] = useState(course?.privacy);
    const { toast } = useToast();

    useEffect(() => {
        if (course) {
            setPublished(course.published);
            setPrivacy(course.privacy);
        }
    }, [course]);

    const updatePublishingDetails = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
    };

    const togglePublishedStatus = async () => {
        const query = `
      mutation {
        course: updateCourse(courseData: {
          id: "${course!.courseId}"
          published: ${!published}
        }) {
          courseId,
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
                id: "${course!.courseId}"
                privacy: ${privacy === "UNLISTED" ? "PUBLIC" : "UNLISTED"}
            }) {
                courseId,
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
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                return response.course;
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
                    disabled={loading}
                >
                    {capitalize(privacy)}
                </Button>
            </div>
        </Form>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Publish);
