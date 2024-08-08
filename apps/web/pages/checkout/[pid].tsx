import { Course, Page, SiteInfo } from "@courselit/common-models";
import { PriceTag, Section } from "@courselit/components-library";
import { AppState } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { useRouter } from "next/router";
import { connect } from "react-redux";
import BaseLayout from "@/components/public/base-layout";
import { FREE_COURSES_TEXT } from "../../ui-config/constants";
import {
    CHECKOUT_PAGE_TITLE,
    CHECKOUT_PAGE_TOTAL,
} from "../../ui-config/strings";
import { getBackendAddress, getPage } from "../../ui-lib/utils";
import dynamic from "next/dynamic";
const PurchaseStatus = dynamic(
    () => import("@/components/public/purchase-status"),
);
const Checkout = dynamic(() => import("@/components/public/checkout"));

interface CheckoutProductProps {
    page: Page;
    product: Course;
    siteInfo: SiteInfo;
}

function CheckoutProduct({ page, product, siteInfo }: CheckoutProductProps) {
    const router = useRouter();

    return (
        <BaseLayout layout={page.layout} title={CHECKOUT_PAGE_TITLE}>
            <div className="mx-auto lg:max-w-[1200px] w-full">
                <div className="flex flex-col p-4 ">
                    <h1 className="text-4xl font-semibold my-4 lg:my-8">
                        {CHECKOUT_PAGE_TITLE}
                    </h1>
                    {!product && <>...</>}
                    {product && (
                        <Section className="p-2">
                            <h2 className="text-2xl mb-4">{product.title}</h2>
                            <div className="flex font-semibold justify-between mb-8">
                                <p>{CHECKOUT_PAGE_TOTAL}</p>
                                <PriceTag
                                    cost={product.cost as number}
                                    freeCostCaption={FREE_COURSES_TEXT}
                                    currencyISOCode={
                                        siteInfo.currencyISOCode as string
                                    }
                                />
                            </div>
                            {router.query.id && <PurchaseStatus />}
                            {!router.query.id && (
                                <Checkout course={product as Course} />
                            )}
                        </Section>
                    )}
                </div>
            </div>
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
