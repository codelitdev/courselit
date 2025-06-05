import { ThemeContext } from "@components/contexts";
import { Course } from "@courselit/common-models";
import { Image } from "@courselit/components-library";
import { useContext } from "react";
import { truncate } from "@ui-lib/utils";
import {
    PageCard,
    PageCardContent,
    PageCardHeader,
    PageCardImage,
    Subheader1,
} from "@courselit/page-primitives";
import Link from "next/link";

export function BlogContentCard({ product }: { product: Course }) {
    const { theme: uiTheme } = useContext(ThemeContext);
    const { theme } = uiTheme;

    return (
        <PageCard isLink={true} className="overflow-hidden" theme={theme}>
            <Link
                href={`/blog/${product.slug}/${product.courseId}`}
                style={{
                    height: "100%",
                    display: "block",
                }}
            >
                <PageCardImage
                    src={
                        product.featuredImage?.file ||
                        "/courselit_backdrop_square.webp"
                    }
                    alt={product.title}
                    className="aspect-video object-cover"
                    theme={theme}
                />
                <PageCardContent theme={theme}>
                    <PageCardHeader theme={theme}>
                        {product.title}
                    </PageCardHeader>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 ascp">
                            <Image
                                src={product.user?.avatar?.thumbnail}
                                alt={product.user?.name || "User Avatar"}
                                loading="lazy"
                                className="rounded-full"
                                objectFit="cover"
                                width="w-8"
                                height="h-8"
                            />
                            <Subheader1 theme={theme}>
                                {truncate(product.user?.name || "Unnamed", 20)}
                            </Subheader1>
                        </div>
                    </div>
                </PageCardContent>
            </Link>
        </PageCard>
    );
}
