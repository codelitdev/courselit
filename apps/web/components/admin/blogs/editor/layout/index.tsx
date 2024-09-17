import React, { ReactNode } from "react";
import dynamic from "next/dynamic";
import generateTabs from "./tabs-data";
import { Address, Profile, SiteInfo } from "@courselit/common-models";

const BlogHeader = dynamic(() => import("./header"));
const Tabs = dynamic(() => import("../../../../tabs"));

interface ProductEditorLayoutProps {
    id: string;
    profile: Profile;
    siteInfo: SiteInfo;
    children: ReactNode;
    address: Address;
    prefix: string;
}

export default function ProductEditorLayout({
    id,
    children,
    profile,
    siteInfo,
    address,
    prefix,
}: ProductEditorLayoutProps) {
    const breadcrumbs = [{ text: "Blogs", url: `/${prefix}/blogs` }];

    return (
        <div className="flex flex-col">
            <BlogHeader
                id={id as string}
                breadcrumbs={breadcrumbs}
                address={address}
            />
            <div className="mb-4">
                <Tabs tabs={generateTabs(prefix, id as string)} />
            </div>
            {children}
        </div>
    );
}
