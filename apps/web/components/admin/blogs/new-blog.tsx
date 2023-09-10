import React, { useState } from "react";
import { Address, AppMessage } from "@courselit/common-models";
import {
    Section,
    Form,
    FormField,
    Button,
} from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { useRouter } from "next/router";
import { connect } from "react-redux";
import {
    BTN_CONTINUE,
    BTN_NEW_BLOG,
    BUTTON_CANCEL_TEXT,
    COURSE_TYPE_BLOG,
    FORM_NEW_PRODUCT_TITLE_PLC,
} from "../../../ui-config/strings";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import Link from "next/link";

interface NewBlogProps {
    address: Address;
    dispatch: AppDispatch;
    networkAction: boolean;
}

function NewBlog({ address, dispatch, networkAction: loading }: NewBlogProps) {
    const [title, setTitle] = useState("");
    const router = useRouter();

    const createCourse = async () => {
        const query = `
            mutation {
                course: createCourse(courseData: {
                    title: "${title}",
                    type: ${COURSE_TYPE_BLOG.toUpperCase()},
                }) {
                    id,
                    courseId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                router.replace(
                    `/dashboard/blog/${response.course.courseId}/details`,
                );
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <Section>
            <div className="flex flex-col">
                <h1 className="text-4xl font-semibold mb-4">{BTN_NEW_BLOG}</h1>
                <Form onSubmit={createCourse} className="flex flex-col gap-4">
                    <FormField
                        required
                        label="Title"
                        name="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={FORM_NEW_PRODUCT_TITLE_PLC}
                    />
                    <div className="flex gap-2">
                        <Button
                            disabled={!title || (!!title && loading)}
                            onClick={createCourse}
                        >
                            {BTN_CONTINUE}
                        </Button>
                        <Link href={`/dashboard/blogs`} legacyBehavior>
                            <Button variant="soft">{BUTTON_CANCEL_TEXT}</Button>
                        </Link>
                    </div>
                </Form>
            </div>
        </Section>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    networkAction: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(NewBlog);
