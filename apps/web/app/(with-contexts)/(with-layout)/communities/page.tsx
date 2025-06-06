"use client";

import { useCallback, useContext } from "react";
import { CommunitiesList } from "./communities-list";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeContext } from "@components/contexts";
import { Header1, Section } from "@courselit/page-primitives";

export default function CommunitiesPage() {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams?.get("page") || "1");
    const router = useRouter();
    const { theme } = useContext(ThemeContext);

    const handlePageChange = useCallback(
        (value: number) => {
            router.push(`/communities?page=${value}`);
        },
        [router],
    );

    return (
        <Section theme={theme.theme}>
            <div className="flex flex-col gap-4">
                <Header1 theme={theme.theme}>Communities</Header1>
                <CommunitiesList
                    page={page}
                    onPageChange={handlePageChange}
                    itemsPerPage={10}
                />
            </div>
        </Section>
    );
}
