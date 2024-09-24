"use client";

import React, { useEffect, useState } from "react";
import { Course, WidgetProps } from "@courselit/common-models";
import {
    CourseItem,
    TextRenderer,
    Skeleton,
} from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import {
    FetchBuilder,
    getGraphQLQueryStringFromObject,
} from "@courselit/utils";
import Settings from "./settings";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
} from "./defaults";

export default function Widget({
    settings: {
        products,
        title,
        description,
        backgroundColor,
        color,
        headerAlignment,
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
        cssId,
    },
    state,
    dispatch,
}: WidgetProps<Settings>) {
    const [productItems, setProductItems] = useState<Partial<Course>[]>([]);

    useEffect(() => {
        if (products && products.length) {
            loadCourses();
        } else {
            setProductItems([]);
        }
    }, [products]);

    const loadCourses = async () => {
        const productsArgs = getGraphQLQueryStringFromObject(products);
        const query = `
            query {
                product: getCourses(ids: ${productsArgs}) {
                    title,
                    description,
                    featuredImage {
                        file,
                        thumbnail,
                        caption
                    },
                    courseId,
                    cost,
                    type,
                    pageId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${state.address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.product) {
                setProductItems(response.product);
            }
        } catch (err) {
            console.log("Error", err.message); // eslint-disable-line no-console
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    return (
        <section
            className={`py-[${verticalPadding}px]`}
            style={{
                backgroundColor,
                color,
            }}
            id={cssId}
        >
            <div className="mx-auto lg:max-w-[1200px]">
                <div
                    className={`flex flex-col px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%] gap-4`}
                >
                    <div
                        className="flex flex-col mb-4"
                        style={{
                            alignItems:
                                headerAlignment === "center"
                                    ? "center"
                                    : "flex-start",
                        }}
                    >
                        <h2 className="text-4xl mb-4">{title}</h2>
                        {description && <TextRenderer json={description} />}
                    </div>
                    {productItems.length === 0 && (
                        <div className="flex flex-wrap gap-[1%]">
                            <div className="basis-full md:basis-[49.5%] lg:basis-[32.6666%] mb-6">
                                <div className="mb-4">
                                    <Skeleton className="h-[200px] lg:h-[220px] w-full mb-4" />
                                    <Skeleton className="h-[16px] w-full mb-1" />
                                    <Skeleton className="h-[20px] w-full mb-1" />
                                    <Skeleton className="h-[18px] w-full" />
                                </div>
                            </div>
                            <div className="basis-full md:basis-[49.5%] lg:basis-[32.6666%] mb-6">
                                <div className="mb-4">
                                    <Skeleton className="h-[200px] lg:h-[220px] w-full mb-4" />
                                    <Skeleton className="h-[16px] w-full mb-1" />
                                    <Skeleton className="h-[20px] w-full mb-1" />
                                    <Skeleton className="h-[18px] w-full" />
                                </div>
                            </div>
                            <div className="basis-full md:basis-[49.5%] lg:basis-[32.6666%] mb-6">
                                <div className="mb-4">
                                    <Skeleton className="h-[200px] lg:h-[220px] w-full mb-4" />
                                    <Skeleton className="h-[16px] w-full mb-1" />
                                    <Skeleton className="h-[20px] w-full mb-1" />
                                    <Skeleton className="h-[18px] w-full" />
                                </div>
                            </div>
                        </div>
                    )}
                    {productItems.length > 0 && (
                        <div className="flex flex-wrap gap-[1%]">
                            {productItems.map(
                                (course: Course, index: number) => (
                                    <div
                                        key={course.courseId}
                                        className="basis-full md:basis-[49.5%] lg:basis-[32.6666%] mb-6"
                                    >
                                        <CourseItem
                                            course={course}
                                            siteInfo={state.siteinfo}
                                            freeCostCaption={"FREE"}
                                            key={index}
                                        />
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
