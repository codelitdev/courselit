import { Address, Course } from "@courselit/common-models";
import { Lesson } from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import { InternalCourse } from "@models/Course";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { useCallback, useEffect, useState } from "react";

export type ProductWithAdminProps = Partial<
    Omit<InternalCourse, "paymentPlans"> &
        Pick<Course, "paymentPlans"> & {
            lessons: Pick<Lesson, "title" | "groupId" | "lessonId" | "type"> &
                { id: string }[];
        }
>;

export default function useProduct(
    id: string,
    address: Address,
): { product: ProductWithAdminProps | undefined | null; loaded: boolean } {
    const [product, setProduct] = useState<
        ProductWithAdminProps | undefined | null
    >();
    const { toast } = useToast();
    const [loaded, setLoaded] = useState(false);

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
                                content,
                                subject
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
                    }
                }
            }
        `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            try {
                const response = await fetch.exec();
                if (response.course) {
                    setProduct(response.course);
                } else {
                    setProduct(null);
                }
            } catch (err: any) {
                setProduct(null);
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: err.message,
                    variant: "destructive",
                });
            } finally {
                setLoaded(true);
            }
        },
        [address?.backend],
    );

    useEffect(() => {
        if (id && address) {
            loadProduct(id);
        }
    }, [id, address, loadProduct]);

    return { product, loaded };
}
