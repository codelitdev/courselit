import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Course } from "@courselit/common-models";
import { getSymbolFromCurrency, Link } from "@courselit/components-library";
import { getPlanPrice } from "@courselit/utils";
import { useContext } from "react";
import { SiteInfoContext } from "@components/contexts";
import { Badge } from "@components/ui/badge";
import { truncate } from "@ui-lib/utils";

export function ProductContentCard({ product }: { product: Course }) {
    const siteinfo = useContext(SiteInfoContext);
    const defaultPlan = product.paymentPlans?.filter(
        (plan) => plan.planId === product.defaultPaymentPlan,
    )[0];
    const { amount, period } = getPlanPrice(defaultPlan);

    return (
        <Link href={`/p/${product.pageId}`}>
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="relative aspect-video">
                    <Image
                        src={
                            product.featuredImage?.thumbnail ||
                            "/courselit_backdrop_square.webp"
                        }
                        alt={product.title}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
                <CardContent className="p-4">
                    <h3 className="text-xl font-semibold mb-3">
                        {product.title}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Image
                                src={
                                    product.user?.avatar?.thumbnail ||
                                    "/courselit_backdrop_square.webp"
                                }
                                alt={product.user?.name || "User Avatar"}
                                width={24}
                                height={24}
                                className="rounded-full"
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
                </CardContent>
            </Card>
        </Link>
    );
}
