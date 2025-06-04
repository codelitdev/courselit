"use client";

import { Breadcrumbs, TextRenderer } from "@courselit/components-library";
import {
    Header1,
    Caption,
    Text1,
    Text2,
} from "@courselit/page-primitives";
import Image from "next/image";
import { formattedLocaleDate, truncate } from "@ui-lib/utils";
import useProduct from "@/hooks/use-product";
import { AddressContext, ThemeContext } from "@components/contexts";
import { useContext } from "react";
import Link from "next/link";

export default function Post({ courseId }: { courseId: string }) {
    const address = useContext(AddressContext);
    const { theme } = useContext(ThemeContext);
    const { product: post, loaded } = useProduct(courseId, address);

    if (!loaded && !post) {
        return null;
    }

    if (loaded && !post) {
        return <Text1>Post not found</Text1>;
    }

    return (
        <>
            <Breadcrumbs aria-label="back to blog" className="mb-4">
                <Text2 className="cursor-pointer" theme={theme.theme}>
                    <Link href="/blog">Blog</Link>
                </Text2>
                <Text2 theme={theme.theme}>{truncate(post?.title, 20)}</Text2>
            </Breadcrumbs>
            <Header1 theme={theme.theme}>{post?.title}</Header1>
            <div className="flex items-center gap-4 mb-6">
                <Image
                    src={
                        post.featuredImage?.file ||
                        "/courselit_backdrop_square.webp"
                    }
                    alt={post.featuredImage?.caption || ""}
                    width={32}
                    height={32}
                    className="rounded-full"
                />
                <div className="flex items-center gap-2">
                    <Text2 theme={theme.theme}>{post.creatorName}</Text2>
                    <Caption theme={theme.theme}>
                        · {formattedLocaleDate(post.updatedAt, "long")}
                    </Caption>
                </div>
            </div>
            {post.description && (
                <Text1 theme={theme.theme}>
                    <TextRenderer
                        json={JSON.parse(post.description)}
                        showTableOfContent={true}
                    />
                </Text1>
            )}
        </>
    );
}
