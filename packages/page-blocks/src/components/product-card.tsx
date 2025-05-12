import { Course, SiteInfo, Theme } from "@courselit/common-models";
import { getSymbolFromCurrency, Image } from "@courselit/components-library";
import { Badge } from "@courselit/components-library";
import { PageCardHeader, Subheader2 } from "@courselit/page-primitives";
import { PageCardContent } from "@courselit/page-primitives";
import { PageCard, PageCardImage } from "@courselit/page-primitives";
import { getPlanPrice, truncate } from "@courselit/utils";

export function ProductCard({
    product,
    siteinfo,
    theme,
}: {
    product: Course;
    siteinfo: SiteInfo;
    theme?: Theme;
}) {
    const defaultPlan = product.paymentPlans?.filter(
        (plan) => plan.planId === product.defaultPaymentPlan,
    )[0];
    const { amount, period } = getPlanPrice(defaultPlan);

    return (
        <PageCard
            href={`/p/${product.pageId}`}
            className="overflow-hidden"
            theme={theme}
        >
            <PageCardImage
                src={product.featuredImage?.file}
                alt={product.title}
                className="aspect-video object-cover rounded-t-lg rounded-b-none"
                theme={theme}
            />
            <PageCardContent theme={theme}>
                <PageCardHeader theme={theme}>{product.title}</PageCardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Image
                            src={product.user?.avatar?.thumbnail}
                            alt={product.user?.name || "User Avatar"}
                        />
                        <Subheader2 theme={theme}>
                            {truncate(product.user?.name || "Unnamed", 20)}
                        </Subheader2>
                    </div>
                    <Badge className="flex items-center font-medium">
                        {getSymbolFromCurrency(
                            siteinfo.currencyISOCode || "USD",
                        )}
                        <span>{amount.toFixed(2)}</span>
                        <span className="ml-1">{period}</span>
                    </Badge>
                </div>
            </PageCardContent>
        </PageCard>
    );
}
