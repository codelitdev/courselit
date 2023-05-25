import { Address, Course, Page, SiteInfo } from "@courselit/common-models";
import { PriceTag } from "@courselit/components-library";
import {
    actionCreators,
    AppDispatch,
    AppState,
} from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { Grid, Skeleton, Typography } from "@mui/material";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
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
    siteInfo: SiteInfo;
    address: Address;
    dispatch: AppDispatch;
}

function CheckoutProduct({
    page,
    siteInfo,
    address,
    dispatch,
}: CheckoutProductProps) {
    const [product, setProduct] = useState<Course>();
    const router = useRouter();

    useEffect(() => {
        if (!router.isReady) return;

        loadCourse();
    }, [router.isReady]);

    const loadCourse = async () => {
        const query = `
            query {
                product: getCourse(id: "${router.query.pid}") {
                    title,
                    cost
                    description,
                    featuredImage {
                        thumbnail,
                        caption
                    },
                    courseId,
                    slug
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.product) {
                setProduct(response.product);
            }
        } catch (err: any) {
            console.error("Error", err.message);
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

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
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps)(CheckoutProduct);

export async function getServerSideProps({ query, req }: any) {
    const address = getBackendAddress(req.headers);
    const page = await getPage(address);
    if (!page) {
        return { notFound: true };
    }
    return { props: { page } };
}
