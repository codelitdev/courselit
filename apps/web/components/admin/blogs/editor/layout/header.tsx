import React from "react";
import dynamic from "next/dynamic";
import useCourse from "../course-hook";
import { useRouter } from "next/router";
import {
    MenuItem,
    Menu2,
    Link,
    Breadcrumbs,
} from "@courselit/components-library";
import {
    DELETE_PRODUCT_POPUP_HEADER,
    DELETE_PRODUCT_POPUP_TEXT,
    MENU_BLOG_VISIT,
    PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
} from "../../../../../ui-config/strings";
import { MoreVert } from "@courselit/icons";
import { deleteProduct } from "../../helpers";
import { AppDispatch, AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import { Address } from "@courselit/common-models";

const AppLoader = dynamic(() => import("../../../../app-loader"));

interface Breadcrumb {
    text: string;
    url: string;
}

interface BlogHeaderProps {
    breadcrumbs?: Breadcrumb[];
    id: string;
    address: Address;
    dispatch: AppDispatch;
}

function BlogHeader({ id, breadcrumbs, address, dispatch }: BlogHeaderProps) {
    const course = useCourse(id);
    const router = useRouter();

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
                                <li key={crumb.text}>{crumb.text}</li>
                            ),
                        )}
                    </Breadcrumbs>
                </div>
            )}
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-semibold mb-4">{course.title}</h1>
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
                                    dispatch,
                                    onDeleteComplete: () => {
                                        router.replace(`/dashboard/blogs`);
                                    },
                                })
                            }
                        ></MenuItem>
                    </Menu2>
                </div>
            </div>
        </div>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(BlogHeader);
