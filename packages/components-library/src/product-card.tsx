import { Badge } from "@/components/ui/badge";
import { Course, SiteInfo, Theme } from "@courselit/common-models";
import { getPlanPrice, truncate } from "@courselit/utils";
import getSymbolFromCurrency from "currency-symbol-map";
import { Image } from "./image";
import {
    PageCard,
    PageCardHeader,
    PageCardContent,
    PageCardImage,
    Subheader2,
} from "@courselit/page-primitives";

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
                            loading="lazy"
                            className="!aspect-square rounded-full"
                            width="w-6"
                            height="h-6"
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
        // <Link href={`/p/${product.pageId}`}>
        //     <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        //         <div className="relative aspect-video">
        //             <Image
        //                 src={
        //                     product.featuredImage?.thumbnail
        //                 }
        //                 alt={product.title}
        //                 loading="lazy"
        //             />
        //         </div>
        //         <CardContent className="p-4">
        //             <h3 className="text-xl font-semibold mb-3">
        //                 {product.title}
        //             </h3>
        // <div className="flex items-center justify-between text-sm text-muted-foreground">
        //     <div className="flex items-center gap-1">
        //             <Image
        //                 src={
        //                     product.user?.avatar?.thumbnail
        //                 }
        //                 alt={product.user?.name || "User Avatar"}
        //                 loading="lazy"
        //                 className="!aspect-square !object-cover"
        //                 width="w-6"
        //                 height="h-6"
        //             />
        //         <span>
        //             {truncate(product.user?.name || "Unnamed", 20)}
        //         </span>
        //     </div>
        //     <Badge className="flex items-center font-medium">
        //         {getSymbolFromCurrency(
        //             siteinfo.currencyISOCode || "USD",
        //         )}
        //         <span>{amount.toFixed(2)}</span>
        //         <span className="ml-1">{period}</span>
        //     </Badge>
        // </div>
        //         </CardContent>
        //     </Card>
        // </Link>
    );
}
