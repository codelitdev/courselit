import { Course } from "@courselit/common-models";
import { Lesson } from "@courselit/common-models";
import { useCallback, useContext, useEffect, useState } from "react";
import { useGraphQLFetch } from "./use-graphql-fetch";
import { AddressContext } from "@components/contexts";
import { InternalCourse } from "@courselit/common-logic";

export type ProductWithAdminProps = Partial<
    Omit<InternalCourse, "paymentPlans"> &
        Pick<Course, "paymentPlans"> & {
            lessons: Pick<
                Lesson,
                "title" | "groupId" | "lessonId" | "type" | "published"
            > &
                { id: string }[];
        }
>;

export default function useProduct(id?: string | null): {
    product: ProductWithAdminProps | undefined | null;
    loaded: boolean;
    error: any;
} {
    const [product, setProduct] = useState<
        ProductWithAdminProps | undefined | null
    >();
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<any>(null);
    const address = useContext(AddressContext);
    const fetch = useGraphQLFetch();

    const loadProduct = useCallback(
        async (courseId: string) => {
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
                        published
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
                        includedProducts
                    }
                    leadMagnet
                    defaultPaymentPlan
                    certificate
                }
            }
        `;
            const fetchInstance = fetch.setPayload(query).build();
            try {
                const response = await fetchInstance.exec();
                if (response.course) {
                    setProduct(response.course);
                    setError(null);
                } else {
                    setProduct(null);
                }
            } catch (err: any) {
                setError(err);
                setProduct(null);
            } finally {
                setLoaded(true);
            }
        },
        [fetch],
    );

    useEffect(() => {
        if (id && address) {
            loadProduct(id);
        }
    }, [id, address, loadProduct]);

    return { product, loaded, error };
}
