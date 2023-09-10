import { useRouter } from "next/router";
import React, { ReactNode } from "react";
import dynamic from "next/dynamic";
import { MANAGE_COURSES_PAGE_HEADING } from "../../../../../ui-config/strings";
import generateTabs from "./tabs-data";

const BaseLayout = dynamic(() => import("../../../base-layout"));
const BlogHeader = dynamic(() => import("./header"));
const Tabs = dynamic(() => import("../../../../tabs"));

interface ProductEditorLayoutProps {
    children: ReactNode;
}

export default function ProductEditorLayout({
    children,
}: ProductEditorLayoutProps) {
    const router = useRouter();
    const { id } = router.query;
    const breadcrumbs = [{ text: "Blogs", url: `/dashboard/blogs` }];

    return (
        <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
            <div className="flex flex-col">
                <BlogHeader id={id as string} breadcrumbs={breadcrumbs} />
                <div className="mb-4">
                    <Tabs tabs={generateTabs(id as string)} />
                </div>
                {children}
            </div>
        </BaseLayout>
    );
}
