import Image from "./image";
import type { Course, SiteInfo } from "@courselit/common-models";
import PriceTag from "./pricetag";
import Link from "./link";

interface CourseItemProps {
    course: Course;
    siteInfo: SiteInfo;
    freeCostCaption?: string;
    thumbnailLoading?: "eager" | "lazy";
}

const CourseItem = (props: CourseItemProps) => {
    const {
        course,
        siteInfo,
        freeCostCaption,
        thumbnailLoading = "lazy",
    } = props;

    const href =
        course.type === "BLOG"
            ? `/blog/${course.slug}/${course.courseId}`
            : `/p/${course.pageId}`;

    return (
        <Link href={href}>
            <article className="flex flex-col">
                <div className="mb-4 border rounded-md overflow-hidden">
                    <Image
                        src={
                            course.featuredImage &&
                            (course.featuredImage.file ||
                                course.featuredImage.thumbnail)
                        }
                        loading={thumbnailLoading}
                        sizes="40vw"
                        alt={course.featuredImage?.caption}
                    />
                </div>
                {course.type !== "BLOG" && (
                    <h3 className="font-thin text-xs">
                        {course.type.toUpperCase()}
                    </h3>
                )}
                <h3 className="text-lg font-semibold">{course.title}</h3>
                {!(course.type === "BLOG") && (
                    <PriceTag
                        cost={course.cost}
                        freeCostCaption={freeCostCaption}
                        currencyISOCode={siteInfo.currencyISOCode}
                    />
                )}
            </article>
        </Link>
    );
};

export default CourseItem;
