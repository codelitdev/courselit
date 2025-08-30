import { Course } from "@courselit/common-models";
import { Lesson } from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import { useCallback, useContext, useEffect, useState } from "react";
import { useGraphQLFetch } from "./use-graphql-fetch";
import { AddressContext } from "@components/contexts";

export type ProductWithAdminProps = Partial<
    Omit<Course, "paymentPlans"> &
        Pick<Course, "paymentPlans"> & {
            lessons: Pick<Lesson, "title" | "groupId" | "lessonId" | "type"> &
                { id: string }[];
        }
>;

export default function useProduct(id?: string | null): {
    product: ProductWithAdminProps | undefined | null;
    loaded: boolean;
} {
    const [product, setProduct] = useState<
        ProductWithAdminProps | undefined | null
    >();
    const { toast } = useToast();
    const [loaded, setLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const address = useContext(AddressContext);
    const fetch = useGraphQLFetch();

    const loadProduct = useCallback(
        async (courseId: string) => {
            if (hasError) return;

            const query = `
            query {
                course: getCourse(id: "${courseId}") {
                    title,
                    description,
                    type,
                    slug,
                    lessons {
                        id,
                        title,
                        groupId,
                        lessonId,
                        type
                    },
                    groups {
                        id,
                        name,
                        rank,
                        lessonsOrder,
                        drip {
                            type,
                            status,
                            delayInMillis,
                            dateInUTC,
                            email {
                                content {
                                    content {
                                        blockType,
                                        settings
                                    },
                                    style,
                                    meta
                                },
                                subject
                                emailId
                            }
                        }
                    },
                    courseId,
                    cost,
                    costType,
                    creatorName,
                    featuredImage {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                    published,
                    privacy,
                    pageId,
                    updatedAt
                    paymentPlans {
                        planId
                        name
                        type
                        oneTimeAmount
                        emiAmount
                        emiTotalInstallments
                        subscriptionMonthlyAmount
                        subscriptionYearlyAmount
                        entityId
                        entityType
                    }
                    leadMagnet
                    defaultPaymentPlan
                }
            }
        `;
            const fetchInstance = fetch.setPayload(query).build();
            try {
                const response = await fetchInstance.exec();
                if (response.course) {
                    setProduct(response.course);
                } else {
                    setProduct(null);
                }
            } catch (err: any) {
                setHasError(true);
                setProduct(null);
                // toast({
                //     title: TOAST_TITLE_ERROR,
                //     description: err.message,
                //     variant: "destructive",
                // });
            } finally {
                setLoaded(true);
            }
        },
        [fetch, hasError],
    );

    useEffect(() => {
        if (id && address && !hasError) {
            loadProduct(id);
        }
    }, [id, address, loadProduct, hasError]);

    return { product, loaded };
}
