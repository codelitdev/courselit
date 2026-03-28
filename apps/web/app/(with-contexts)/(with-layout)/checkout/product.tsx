"use client";

import { AddressContext } from "@components/contexts";
import Checkout, { Product } from "@components/public/payments/checkout";
import { Constants, PaymentPlan, Course } from "@courselit/common-models";
import type { MembershipEntityType } from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { useSearchParams } from "next/navigation";
import { useCallback, useContext, useEffect, useState } from "react";
import type { SSOProvider } from "../login/page";

const { MembershipEntityType } = Constants;

export default function ProductCheckout() {
    const address = useContext(AddressContext);
    const searchParams = useSearchParams();
    const entityId = searchParams?.get("id");
    const entityType = searchParams?.get("type");
    const { toast } = useToast();

    const [product, setProduct] = useState<Product | null>(null);
    const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
    const [includedProducts, setIncludedProducts] = useState<Course[]>([]);
    const [ssoProvider, setSSOProvider] = useState<SSOProvider | undefined>();

    const getIncludedProducts = useCallback(async () => {
        const query = `
            query ($entityId: String!, $entityType: MembershipEntityType!) {
                includedProducts: getIncludedProducts(entityId: $entityId, entityType: $entityType) {
                    courseId
                    title
                    slug
                    featuredImage {
                        thumbnail
                        file
                    }
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    entityId,
                    entityType: (entityType === MembershipEntityType.COURSE
                        ? MembershipEntityType.COURSE
                        : MembershipEntityType.COMMUNITY
                    ).toUpperCase(),
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.includedProducts) {
                setIncludedProducts([...response.includedProducts]);
            } else {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: "Course not found",
                });
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
            });
        } finally {
        }
    }, [address.backend, entityId, entityType, toast]);

    const getProduct = useCallback(async () => {
        const query = `
            query ($id: String!) {
                course: getCourse(id: $id) {
                    courseId
                    title
                    slug
                    featuredImage {
                        thumbnail
                        file
                    }
                    paymentPlans {
                        planId
                        name
                        type
                        oneTimeAmount
                        emiAmount
                        emiTotalInstallments
                        subscriptionMonthlyAmount
                        subscriptionYearlyAmount
                        description
                        includedProducts
                    }
                    defaultPaymentPlan
                }
                ssoProvider: getSSOProvider {
                    providerId
                    domain
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({ query, variables: { id: entityId } })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.course) {
                setProduct({
                    id: response.course.courseId,
                    name: response.course.title,
                    slug: response.course.slug,
                    featuredImage: response.course.featuredImage?.file,
                    type: MembershipEntityType.COURSE,
                    defaultPaymentPlanId: response.course.defaultPaymentPlan,
                });
                setPaymentPlans([...response.course.paymentPlans]);
            } else {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: "Course not found",
                });
            }
            if (response.ssoProvider) {
                setSSOProvider(response.ssoProvider);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
            });
        } finally {
        }
    }, [address.backend, entityId, toast]);

    const getCommunity = useCallback(async () => {
        const query = `
            query ($id: String!) {
                community: getCommunity(id: $id) {
                    communityId
                    name
                    paymentPlans {
                        planId
                        name
                        type
                        oneTimeAmount
                        emiAmount
                        emiTotalInstallments
                        subscriptionMonthlyAmount
                        subscriptionYearlyAmount
                        description
                        includedProducts
                    }
                    featuredImage {
                        thumbnail
                        file
                    }
                    autoAcceptMembers
                    joiningReasonText
                    defaultPaymentPlan
                }
                ssoProvider: getSSOProvider {
                    providerId
                    domain
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({ query, variables: { id: entityId } })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.community) {
                setProduct({
                    id: response.community.communityId,
                    name: response.community.name,
                    type: MembershipEntityType.COMMUNITY,
                    featuredImage: response.community.featuredImage?.file,
                    joiningReasonText: response.community.joiningReasonText,
                    autoAcceptMembers: response.community.autoAcceptMembers,
                    defaultPaymentPlanId: response.community.defaultPaymentPlan,
                });
                setPaymentPlans([...response.community.paymentPlans]);
            } else {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: "Community not found",
                });
            }
            if (response.ssoProvider) {
                setSSOProvider(response.ssoProvider);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
            });
        } finally {
        }
    }, [address.backend, entityId, toast]);

    useEffect(() => {
        if (entityId && entityType) {
            if (entityType === MembershipEntityType.COURSE) {
                getProduct();
            } else if (entityType === MembershipEntityType.COMMUNITY) {
                getCommunity();
            }
        }
    }, [entityId, entityType, getProduct, getCommunity]);

    useEffect(() => {
        if (paymentPlans.length > 0) {
            getIncludedProducts();
        }
    }, [paymentPlans, getIncludedProducts]);

    if (!product) {
        return null;
    }

    return (
        <Checkout
            product={product}
            paymentPlans={paymentPlans}
            includedProducts={includedProducts}
            ssoProvider={ssoProvider}
            type={entityType as MembershipEntityType | undefined}
            id={entityId as string | undefined}
        />
    );
}
