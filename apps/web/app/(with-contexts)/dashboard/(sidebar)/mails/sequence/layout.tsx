import { PAGE_HEADER_EDIT_SEQUENCE } from "@ui-config/strings";
import { Metadata, ResolvingMetadata } from "next";
import { ReactNode } from "react";

export async function generateMetadata(
    {
        params,
        searchParams,
    }: {
        params: any;
        searchParams: { [key: string]: string | string[] | undefined };
    },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `${PAGE_HEADER_EDIT_SEQUENCE} | ${(await parent)?.title?.absolute}`,
    };
}

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
