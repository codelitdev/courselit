import { AddressContext } from "@components/contexts";
import { Course } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { useState, useEffect, useContext } from "react";

export function useProducts(
    page: number,
    itemsPerPage: number,
    filter?: string[],
    publicView: boolean = false,
) {
    const [products, setProducts] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const address = useContext(AddressContext);

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        const fetchProducts = async () => {
            const query = `
            query ($page: Int, $limit: Int, $filter: [CourseFilters], $publicView: Boolean) {
                products: getProducts(page: $page, limit: $limit, filterBy: $filter, publicView: $publicView) {
                    title
                    courseId
                    sales
                    customers
                    featuredImage {
                        thumbnail
                        file
                    }
                    pageId
                    type
                    published
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
                    privacy
                },
                totalProducts: getProductsCount(filterBy: $filter, publicView: $publicView)
            }`;
            try {
                setLoading(true);
                const fetchRequest = fetch
                    .setPayload({
                        query,
                        variables: {
                            page,
                            limit: itemsPerPage,
                            filter,
                            publicView,
                        },
                    })
                    .build();
                const response = await fetchRequest.exec();
                if (response.products) {
                    setProducts(response.products);
                    setTotalPages(response.totalProducts);
                }
            } catch (e) {
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [page, itemsPerPage, filter, address.backend, publicView]);

    return { products, loading, totalPages };
}
