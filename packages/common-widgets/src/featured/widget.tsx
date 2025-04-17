"use client";

import React, { useEffect, useState } from "react";
import { Course, WidgetProps } from "@courselit/common-models";
import {
    TextRenderer,
    SkeletonCard,
    ProductCard,
} from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
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
        // const productsArgs = getGraphQLQueryStringFromObject(products);
        const query = `
            query ($ids: [String]) {
                products: getProducts(ids: $ids, limit: 1000, publicView: true) {
                    title
                    courseId
                    featuredImage {
                        thumbnail
                        file
                    }
                    pageId
                    type
                    paymentPlans {
                        planId
                        name
                        type
                        oneTimeAmount
                        emiAmount
                        emiTotalInstallments
                        subscriptionMonthlyAmount
                        subscriptionYearlyAmount
                    }
                    defaultPaymentPlan
                    user {
                        name
                        avatar {
                            thumbnail
                        }
                    }
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${state.address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    ids: products,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.products) {
                setProductItems(response.products);
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {productItems.length === 0 && (
                            <>
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <SkeletonCard key={index} />
                                ))}
                            </>
                            // <div className="flex flex-wrap gap-[1%]">
                            //     <div className="basis-full md:basis-[49.5%] lg:basis-[32.6666%] mb-6">
                            //         <div className="mb-4">
                            //             <Skeleton className="h-[200px] lg:h-[220px] w-full mb-4" />
                            //             <Skeleton className="h-[16px] w-full mb-1" />
                            //             <Skeleton className="h-[20px] w-full mb-1" />
                            //             <Skeleton className="h-[18px] w-full" />
                            //         </div>
                            //     </div>
                            //     <div className="basis-full md:basis-[49.5%] lg:basis-[32.6666%] mb-6">
                            //         <div className="mb-4">
                            //             <Skeleton className="h-[200px] lg:h-[220px] w-full mb-4" />
                            //             <Skeleton className="h-[16px] w-full mb-1" />
                            //             <Skeleton className="h-[20px] w-full mb-1" />
                            //             <Skeleton className="h-[18px] w-full" />
                            //         </div>
                            //     </div>
                            //     <div className="basis-full md:basis-[49.5%] lg:basis-[32.6666%] mb-6">
                            //         <div className="mb-4">
                            //             <Skeleton className="h-[200px] lg:h-[220px] w-full mb-4" />
                            //             <Skeleton className="h-[16px] w-full mb-1" />
                            //             <Skeleton className="h-[20px] w-full mb-1" />
                            //             <Skeleton className="h-[18px] w-full" />
                            //         </div>
                            //     </div>
                            // </div>
                        )}
                        {productItems.length > 0 && (
                            <>
                                {productItems.map((course: Course) => (
                                    <ProductCard
                                        key={course.courseId}
                                        product={course}
                                        siteinfo={state.siteinfo}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
