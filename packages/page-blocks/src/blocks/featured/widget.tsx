import React, { useEffect, useState } from "react";
import { Course, SiteInfo, WidgetProps } from "@courselit/common-models";
import {
    TextRenderer,
    SkeletonCard,
    getSymbolFromCurrency,
} from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder, getPlanPrice } from "@courselit/utils";
import Settings from "./settings";
import { Header1, Subheader1, Section } from "@courselit/page-primitives";
import { ProductCard } from "../../components";
import { ThemeStyle } from "@courselit/page-models";

export default function Widget({
    settings: {
        products,
        title,
        description,
        headerAlignment,
        maxWidth,
        verticalPadding,
        cssId,
    },
    state,
    dispatch,
}: WidgetProps<Settings>) {
    const { theme } = state;
    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.padding.y =
        verticalPadding || theme.theme.structure.section.padding.y;

    const [productItems, setProductItems] = useState<Partial<Course>[]>([]);

    useEffect(() => {
        if (products && products.length) {
            loadCourses();
        } else {
            setProductItems([]);
        }
    }, [products]);

    const loadCourses = async () => {
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
        <Section theme={overiddenTheme} id={cssId}>
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
                                    title={course.title}
                                    user={{
                                        name: course.user.name || "",
                                        thumbnail:
                                            course.user?.avatar?.thumbnail ||
                                            "",
                                    }}
                                    image={
                                        course.featuredImage?.file ||
                                        "/courselit_backdrop_square.webp"
                                    }
                                    theme={overiddenTheme}
                                    href={`/p/${course.pageId}`}
                                    badgeChildren={getBadgeText(
                                        course,
                                        state.siteinfo,
                                    )}
                                />
                            ))}
                        </>
                    )}
                </div>
            </div>
        </Section>
    );
}

function getBadgeText(course: Course, siteinfo: SiteInfo) {
    const defaultPlan = course.paymentPlans?.filter(
        (plan) => plan.planId === course.defaultPaymentPlan,
    )[0];
    const { amount, period } = getPlanPrice(defaultPlan);

    return (
        <>
            {getSymbolFromCurrency(siteinfo.currencyISOCode || "USD")}
            <span>{amount.toFixed(2)}</span>
            <span className="ml-1">{period}</span>
        </>
    );
}
