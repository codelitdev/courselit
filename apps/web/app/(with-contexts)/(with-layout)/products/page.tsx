"use client";

import { useCallback, useContext } from "react";
import { ProductsList } from "./products-list";
import { useRouter, useSearchParams } from "next/navigation";
import { Header1, Section } from "@courselit/page-primitives";
import { ThemeContext } from "@components/contexts";

export default function CoursesPage() {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams?.get("page") || "1");
    const router = useRouter();
    const { theme } = useContext(ThemeContext);

    const handlePageChange = useCallback(
        (value: number) => {
            router.push(`/products?page=${value}`);
        },
        [router],
    );

    return (
        <Section theme={theme.theme}>
            <div className="flex flex-col gap-4 min-h-[80vh]">
                <Header1 theme={theme.theme}>Products</Header1>
                <ProductsList
                    theme={theme.theme}
                    page={page}
                    onPageChange={handlePageChange}
                />
            </div>
        </Section>
    );
}
