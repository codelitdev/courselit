"use client";

import DashboardContent from "@components/admin/dashboard-content";
import React, { FormEvent, useState } from "react";
import {
    Form,
    FormField,
    Select,
    Link,
    Button,
    useToast,
} from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import { useRouter } from "next/navigation";
import {
    COURSE_TYPE_COURSE,
    COURSE_TYPE_DOWNLOAD,
} from "@/ui-config/constants";
import {
    BTN_CONTINUE,
    BTN_NEW_PRODUCT,
    BUTTON_CANCEL_TEXT,
    TOAST_TITLE_ERROR,
    FORM_NEW_PRODUCT_MENU_COURSE_SUBTITLE,
    FORM_NEW_PRODUCT_MENU_DOWNLOADS_SUBTITLE,
    FORM_NEW_PRODUCT_TITLE_PLC,
    FORM_NEW_PRODUCT_TYPE,
    MANAGE_COURSES_PAGE_HEADING,
} from "@/ui-config/strings";
import { capitalize } from "@/ui-lib/utils";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

const breadcrumbs = [
    { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
    { label: BTN_NEW_PRODUCT, href: "#" },
];

export default function Page() {
    const [title, setTitle] = useState("");
    const [type, setType] = useState(COURSE_TYPE_COURSE);
    const [loading, setLoading] = useState(false);
    const [actionSuccessful, setActionSuccessful] = useState(false);

    const router = useRouter();
    const { toast } = useToast();
    const address = useContext(AddressContext);

    const createCourse = async (e: FormEvent) => {
        e.preventDefault();

        const query = `
            mutation {
                course: createCourse(courseData: {
                    title: "${title}",
                    type: ${type.toUpperCase()},
                }) {
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
            setLoading(true);
            const response = await fetch.exec();
            if (response.course) {
                setActionSuccessful(true);
                router.replace(
                    `/dashboard/product/${response.course.courseId}`,
                );
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
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-semibold mb-4">
                        {BTN_NEW_PRODUCT}
                    </h1>
                    <Form
                        onSubmit={createCourse}
                        className="flex flex-col gap-4"
                    >
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
                                    sublabel:
                                        FORM_NEW_PRODUCT_MENU_COURSE_SUBTITLE,
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
                                    loading ||
                                    actionSuccessful
                                }
                                onClick={createCourse}
                                sx={{ mr: 1 }}
                            >
                                {BTN_CONTINUE}
                            </Button>
                            <Link href="/dashboard/products">
                                <Button variant="soft">
                                    {BUTTON_CANCEL_TEXT}
                                </Button>
                            </Link>
                        </div>
                    </Form>
                </div>
            </div>
        </DashboardContent>
    );
}
