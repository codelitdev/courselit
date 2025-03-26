import { Badge } from "@/components/ui/badge";
import { Course, SiteInfo } from "@courselit/common-models";
import { getPlanPrice, truncate } from "@courselit/utils";
import getSymbolFromCurrency from "currency-symbol-map";
import Image from "./image";
import {
    ContentCard,
    ContentCardHeader,
    ContentCardContent,
    ContentCardImage,
} from "./content-card";

export function ProductCard({
    product,
    siteinfo,
}: {
    product: Course;
    siteinfo: SiteInfo;
}) {
    const defaultPlan = product.paymentPlans?.filter(
        (plan) => plan.planId === product.defaultPaymentPlan,
    )[0];
    const { amount, period } = getPlanPrice(defaultPlan);

    return (
        <ContentCard href={`/p/${product.pageId}`}>
            <ContentCardImage
                src={product.featuredImage?.thumbnail}
                alt={product.title}
            />
            <ContentCardContent>
                <ContentCardHeader>{product.title}</ContentCardHeader>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Image
                            src={product.user?.avatar?.thumbnail}
                            alt={product.user?.name || "User Avatar"}
                            loading="lazy"
                            className="!aspect-square !object-cover"
                            width="w-6"
                            height="h-6"
                        />
                        <span>
                            {truncate(product.user?.name || "Unnamed", 20)}
                        </span>
                    </div>
                    <Badge className="flex items-center font-medium">
                        {getSymbolFromCurrency(
                            siteinfo.currencyISOCode || "USD",
                        )}
                        <span>{amount.toFixed(2)}</span>
                        <span className="ml-1">{period}</span>
                    </Badge>
                </div>
            </ContentCardContent>
        </ContentCard>
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
