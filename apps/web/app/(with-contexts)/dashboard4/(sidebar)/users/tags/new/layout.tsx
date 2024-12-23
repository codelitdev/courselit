import { USERS_TAG_NEW_HEADER } from "@ui-config/strings";
import type { Metadata, ResolvingMetadata } from "next";
import { ReactNode } from "react";

export async function generateMetadata(
    _: any,
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `${USERS_TAG_NEW_HEADER} | ${(await parent)?.title?.absolute}`,
    };
}

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
