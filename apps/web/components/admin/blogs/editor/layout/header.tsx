import React, { useContext } from "react";
import dynamic from "next/dynamic";
import useCourse from "../course-hook";
import {
    MenuItem,
    Menu2,
    Link,
    Breadcrumbs,
    useToast,
} from "@courselit/components-library";
import {
    DELETE_PRODUCT_POPUP_HEADER,
    DELETE_PRODUCT_POPUP_TEXT,
    MENU_BLOG_VISIT,
    PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
} from "@/ui-config/strings";
import { MoreVert } from "@courselit/icons";
import { deleteProduct } from "../../helpers";
import { useRouter } from "next/navigation";
import { truncate } from "@ui-lib/utils";
import { AddressContext } from "@components/contexts";

const AppLoader = dynamic(() => import("../../../../app-loader"));

interface Breadcrumb {
    text: string;
    url: string;
}

interface BlogHeaderProps {
    id: string;
    breadcrumbs?: Breadcrumb[];
}

export default function BlogHeader({ id, breadcrumbs }: BlogHeaderProps) {
    const course = useCourse(id);
    const router = useRouter();
    const { toast } = useToast();
    const address = useContext(AddressContext);

    if (!course) {
        return <></>;
    }

    return (
        <div className="flex flex-col">
            {breadcrumbs && (
                <div className="mb-4">
                    <Breadcrumbs aria-label="product-breadcrumbs">
                        {breadcrumbs.map((crumb: Breadcrumb) =>
                            crumb.url ? (
                                <Link href={crumb.url} key={crumb.url}>
                                    {crumb.text}
                                </Link>
                            ) : (
                                <span key={crumb.text}>{crumb.text}</span>
                            ),
                        )}
                    </Breadcrumbs>
                </div>
            )}
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-semibold mb-4">
                    {truncate(course.title || "", 50)}
                </h1>
                <div>
                    <Menu2 icon={<MoreVert />} variant="soft">
                        <MenuItem>
                            <Link
                                href={`/blog/${course.slug}/${course.courseId}`}
                                className="flex w-full"
                            >
                                {MENU_BLOG_VISIT}
                            </Link>
                        </MenuItem>
                        <MenuItem
                            component="dialog"
                            title={DELETE_PRODUCT_POPUP_HEADER}
                            triggerChildren={
                                PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT
                            }
                            description={DELETE_PRODUCT_POPUP_TEXT}
                            onClick={() =>
                                deleteProduct({
                                    id: course!.id as string,
                                    backend: address.backend,
                                    onDeleteComplete: () => {
                                        router.replace(`/dashboard/blogs`);
                                    },
                                    toast,
                                })
                            }
                        ></MenuItem>
                    </Menu2>
                </div>
            </div>
        </div>
    );
}
