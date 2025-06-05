"use client";

import { Suspense, useCallback, useContext } from "react";
import { BlogsList } from "./blogs-list";
import { PAGE_HEADER_ALL_POSTS } from "@ui-config/strings";
import { ThemeContext } from "@components/contexts";
import { Header1, Section } from "@courselit/page-primitives";
import { useRouter, useSearchParams } from "next/navigation";

export default function BlogsPage() {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams?.get("page") || "1");
    const router = useRouter();
    const { theme } = useContext(ThemeContext);

    const handlePageChange = useCallback(
        (value: number) => {
            router.push(`/blog?page=${value}`);
        },
        [router],
    );

    return (
        <Section theme={theme.theme}>
            <div className="flex flex-col gap-4">
                <Header1 theme={theme.theme}>{PAGE_HEADER_ALL_POSTS}</Header1>
                <Suspense fallback={<div>Loading...</div>}>
                    <BlogsList page={page} onPageChange={handlePageChange} />
                </Suspense>
            </div>
        </Section>
    );
}
