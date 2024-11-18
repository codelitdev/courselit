import React, { ReactNode } from "react";
import dynamic from "next/dynamic";
import generateTabs from "./tabs-data";
import { Address, Profile, SiteInfo } from "@courselit/common-models";
import useCourse from "../course-hook";
import { truncate } from "@ui-lib/utils";

const BlogHeader = dynamic(() => import("./header"));
const Tabs = dynamic(() => import("../../../../tabs"));

interface BlogEditorLayoutProps {
    id: string;
    profile: Profile;
    siteInfo: SiteInfo;
    children: ReactNode;
    address: Address;
    prefix: string;
}

export default function BlogEditorLayout({
    id,
    children,
    address,
    prefix,
}: BlogEditorLayoutProps) {
    const course = useCourse(id, address);
    const breadcrumbs = [
        { text: "Blogs", url: `${prefix}/blogs` },
        {
            text: course && course.title ? truncate(course.title, 10) : "",
            url: "",
        },
    ];

    return (
        <div className="flex flex-col gap-4">
            <BlogHeader
                id={id as string}
                breadcrumbs={breadcrumbs}
                address={address}
            />
            <Tabs tabs={generateTabs(prefix, id as string)} />
            {course && children}
        </div>
    );
}
