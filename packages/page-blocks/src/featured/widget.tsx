import React, { useEffect, useState } from "react";
import { Course, Theme, WidgetProps } from "@courselit/common-models";
import { TextRenderer, SkeletonCard } from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import Settings from "./settings";
import { Header1, Subheader1, Section } from "@courselit/page-primitives";
import { ProductCard } from "../components";

export default function Widget({
    settings: {
        products,
        title,
        description,
        backgroundColor,
        color,
        headerAlignment,
        maxWidth,
        verticalPadding,
        cssId,
    },
    state,
    dispatch,
}: WidgetProps<Settings>) {
    const { theme } = state;
    const overiddenTheme: Theme = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.verticalPadding =
        verticalPadding || theme.theme.structure.section.verticalPadding;

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
        <Section
            theme={overiddenTheme}
            style={{
                backgroundColor:
                    backgroundColor || overiddenTheme?.colors?.background,
                color: color || overiddenTheme?.colors?.text,
            }}
            id={cssId}
        >
            <div className={`flex flex-col w-full gap-4`}>
                <div
                    className="flex flex-col mb-4"
                    style={{
                        alignItems:
                            headerAlignment === "center"
                                ? "center"
                                : "flex-start",
                    }}
                >
                    <Header1 theme={overiddenTheme} className="mb-4">
                        {title}
                    </Header1>
                    {description && (
                        <Subheader1 theme={overiddenTheme}>
                            <TextRenderer json={description} />
                        </Subheader1>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {productItems.length === 0 && (
                        <>
                            {Array.from({ length: 3 }).map((_, index) => (
                                <SkeletonCard
                                    key={index}
                                    theme={overiddenTheme}
                                />
                            ))}
                        </>
                    )}
                    {productItems.length > 0 && (
                        <>
                            {productItems.map((course: Course) => (
                                <ProductCard
                                    key={course.courseId}
                                    product={course}
                                    siteinfo={state.siteinfo}
                                    theme={overiddenTheme}
                                />
                            ))}
                        </>
                    )}
                </div>
            </div>
        </Section>
    );
}
