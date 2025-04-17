import { Course } from "@courselit/common-models";
import {
    ContentCard,
    ContentCardContent,
    ContentCardHeader,
    ContentCardImage,
    Image,
} from "@courselit/components-library";
import { truncate } from "@ui-lib/utils";

export function BlogContentCard({ product }: { product: Course }) {
    return (
        <ContentCard href={`/blog/${product.slug}/${product.courseId}`}>
            <ContentCardImage
                src={product.featuredImage?.file || ""}
                alt={product.title}
            />
            <ContentCardContent>
                <ContentCardHeader>
                    {truncate(product.title, 32)}
                </ContentCardHeader>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 ascp">
                        <Image
                            src={product.user?.avatar?.thumbnail}
                            alt={product.user?.name || "User Avatar"}
                            loading="lazy"
                            className="!aspect-square rounded-full"
                            width="w-6"
                            height="h-6"
                        />
                        <span>
                            {truncate(product.user?.name || "Unnamed", 30)}
                        </span>
                    </div>
                </div>
            </ContentCardContent>
        </ContentCard>
    );
}
