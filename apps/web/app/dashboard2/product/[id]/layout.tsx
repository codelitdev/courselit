import type { Metadata, ResolvingMetadata } from "next";
import ProductLayout from "./product-layout";
import { ReactNode } from "react";
import { EDIT_PRODUCT_HEADER } from "@ui-config/strings";

export async function generateMetadata(
    { params }: { params: any },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `${EDIT_PRODUCT_HEADER} | ${(await parent)?.title?.absolute}`,
    };
}

export default function Layout({
    params,
    children,
}: {
    params: { id: string };
    children: ReactNode;
}) {
    const { id } = params;

    return <ProductLayout id={id}>{children}</ProductLayout>;
}
