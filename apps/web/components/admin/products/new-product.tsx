import React, { FormEvent, useState } from "react";
import { Address, AppMessage } from "@courselit/common-models";
import {
    Form,
    FormField,
    Select,
    Link,
    Button,
    Breadcrumbs,
} from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { useRouter } from "next/navigation";
import { connect } from "react-redux";
import {
    COURSE_TYPE_COURSE,
    COURSE_TYPE_DOWNLOAD,
} from "../../../ui-config/constants";
import {
    BTN_CONTINUE,
    BTN_NEW_PRODUCT,
    BUTTON_CANCEL_TEXT,
    FORM_NEW_PRODUCT_MENU_COURSE_SUBTITLE,
    FORM_NEW_PRODUCT_MENU_DOWNLOADS_SUBTITLE,
    FORM_NEW_PRODUCT_TITLE_PLC,
    FORM_NEW_PRODUCT_TYPE,
    MANAGE_COURSES_PAGE_HEADING,
} from "../../../ui-config/strings";
import { capitalize } from "../../../ui-lib/utils";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { usePathname } from "next/navigation";

interface NewProductProps {
    address: Address;
    dispatch?: AppDispatch;
    networkAction: boolean;
    prefix: string;
}

export function NewProduct({
    address,
    dispatch,
    networkAction: loading,
    prefix,
}: NewProductProps) {
    const [title, setTitle] = useState("");
    const [type, setType] = useState(COURSE_TYPE_COURSE);
    const router = useRouter();
    const path = usePathname();

    const createCourse = async (e: FormEvent) => {
        e.preventDefault();

        const query = `
            mutation {
                course: createCourse(courseData: {
                    title: "${title}",
                    type: ${type.toUpperCase()},
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
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                router.replace(
                    `${prefix}/product/${response.course.courseId}${
                        prefix === "/dashboard" ? "/content" : ""
                    }`,
                );
            }
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

    return (
        <div className="flex flex-col">
            {prefix === "/dashboard" && (
                <div className="mb-4">
                    <Breadcrumbs aria-label="breakcrumb">
                        <Link href={`${prefix}/products`}>
                            {MANAGE_COURSES_PAGE_HEADING}
                        </Link>

                        <p>{BTN_NEW_PRODUCT}</p>
                    </Breadcrumbs>
                </div>
            )}
            <div className="flex flex-col">
                <h1 className="text-4xl font-semibold mb-4">
                    {BTN_NEW_PRODUCT}
                </h1>
                <Form onSubmit={createCourse} className="flex flex-col gap-4">
                    <FormField
                        required
                        label="Title"
                        name="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={FORM_NEW_PRODUCT_TITLE_PLC}
                    />
                    <Select
                        title={FORM_NEW_PRODUCT_TYPE}
                        value={type}
                        onChange={(e: string) => setType(e)}
                        options={[
                            {
                                label: capitalize(COURSE_TYPE_COURSE),
                                value: COURSE_TYPE_COURSE,
                                sublabel: FORM_NEW_PRODUCT_MENU_COURSE_SUBTITLE,
                            },
                            {
                                label: capitalize(COURSE_TYPE_DOWNLOAD),
                                value: COURSE_TYPE_DOWNLOAD,
                                sublabel:
                                    FORM_NEW_PRODUCT_MENU_DOWNLOADS_SUBTITLE,
                            },
                        ]}
                    />
                    <div className="flex gap-2">
                        <Button
                            disabled={
                                !title ||
                                !type ||
                                (!!title && !!type && loading)
                            }
                            onClick={createCourse}
                            sx={{ mr: 1 }}
                        >
                            {BTN_CONTINUE}
                        </Button>
                        <Link href={`${prefix}/products`}>
                            <Button variant="soft">{BUTTON_CANCEL_TEXT}</Button>
                        </Link>
                    </div>
                </Form>
            </div>
        </div>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    networkAction: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(NewProduct);
