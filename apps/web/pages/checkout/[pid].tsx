import { Course, Page, SiteInfo } from "@courselit/common-models";
import { PriceTag } from "@courselit/components-library";
import { AppState } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { Grid, Skeleton, Typography } from "@mui/material";
import { useRouter } from "next/router";
import { connect } from "react-redux";
import BaseLayout from "../../components/public/base-layout";
import { FREE_COURSES_TEXT } from "../../ui-config/constants";
import {
    CHECKOUT_PAGE_TITLE,
    CHECKOUT_PAGE_TOTAL,
} from "../../ui-config/strings";
import { getBackendAddress, getPage } from "../../ui-lib/utils";
import dynamic from "next/dynamic";
const PurchaseStatus = dynamic(
    () => import("../../components/public/purchase-status")
);
const Checkout = dynamic(() => import("../../components/public/checkout"));

interface CheckoutProductProps {
    page: Page;
    product: Course;
    siteInfo: SiteInfo;
}

function CheckoutProduct({ page, product, siteInfo }: CheckoutProductProps) {
    const router = useRouter();

    return (
        <BaseLayout layout={page.layout} title={CHECKOUT_PAGE_TITLE}>
            <Grid container direction="column" sx={{ p: 2, minHeight: "80vh" }}>
                <Grid item sx={{ mb: 2 }}>
                    <Typography variant="h4">{CHECKOUT_PAGE_TITLE}</Typography>
                </Grid>
                {!product && (
                    <Grid item xs={12} sx={{ p: 2 }}>
                        <Skeleton variant="rectangular" height={200} />
                    </Grid>
                )}
                {product && (
                    <Grid item>
                        <Grid
                            container
                            direction="column"
                            sx={{
                                border: "1px solid #eee",
                                borderRadius: 2,
                                p: 2,
                            }}
                        >
                            <Grid item sx={{ mb: 2 }}>
                                <Typography variant="h5">
                                    {product.title}
                                </Typography>
                            </Grid>
                            <Grid item sx={{ mb: 4 }}>
                                <Grid container justifyContent="space-between">
                                    <Grid item>
                                        <Typography variant="h6">
                                            {CHECKOUT_PAGE_TOTAL}
                                        </Typography>
                                    </Grid>
                                    <Grid item>
                                        <PriceTag
                                            cost={product.cost as number}
                                            freeCostCaption={FREE_COURSES_TEXT}
                                            currencyISOCode={
                                                siteInfo.currencyISOCode as string
                                            }
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>
                            {router.query.id && (
                                <Grid item>
                                    <PurchaseStatus />
                                </Grid>
                            )}
                            {!router.query.id && (
                                <Grid item alignSelf="flex-end">
                                    <Checkout course={product as Course} />
                                </Grid>
                            )}
                        </Grid>
                    </Grid>
                )}
            </Grid>
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(CheckoutProduct);

export async function getServerSideProps({ query, req }: any) {
    const address = getBackendAddress(req.headers);
    const page = await getPage(address);
    if (!page) {
        return { notFound: true };
    }
    const course = await getCourse(query.pid, address);
    return { props: { page, product: course } };
}

const getCourse = async (courseId: string, address: string) => {
    const query = `
            query {
                product: getCourse(id: "${courseId}") {
                    title,
                    cost
                    description,
                    featuredImage {
                        thumbnail,
                        caption
                    },
                    courseId,
                    slug,
                    type
                }
            }
        `;
    const fetch = new FetchBuilder()
        .setUrl(`${address}/api/graph`)
        .setPayload(query)
        .setIsGraphQLEndpoint(true)
        .build();

    try {
        const response = await fetch.exec();
        return response.product;
    } catch (err: any) {
        console.error("Error", err.message);
    }
};
