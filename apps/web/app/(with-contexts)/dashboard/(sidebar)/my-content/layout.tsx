import DashboardContent from "@components/admin/dashboard-content";
import {
    MY_CONTENT_FEED_TAB,
    MY_CONTENT_HEADER,
    MY_CONTENT_PRODUCTS_TAB,
} from "@ui-config/strings";
import type { Metadata, ResolvingMetadata } from "next";
import { ReactNode } from "react";
import MyContentTabs from "./my-content-tabs";

export async function generateMetadata(
    _: any,
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `${MY_CONTENT_HEADER} | ${(await parent)?.title?.absolute}`,
    };
}

const breadcrumbs = [{ label: MY_CONTENT_HEADER, href: "#" }];
const tabs = [
    {
        label: MY_CONTENT_FEED_TAB,
        href: "/dashboard/my-content/feed",
    },
    {
        label: MY_CONTENT_PRODUCTS_TAB,
        href: "/dashboard/my-content/products",
    },
];

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="space-y-8">
                <MyContentTabs tabs={tabs} ariaLabel={MY_CONTENT_HEADER} />
                {children}
            </div>
        </DashboardContent>
    );
}
