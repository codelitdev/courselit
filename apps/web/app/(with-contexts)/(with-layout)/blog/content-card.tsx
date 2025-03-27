import { Card, CardContent } from "@/components/ui/card";
import { Course } from "@courselit/common-models";
import { Link } from "@courselit/components-library";
import { getPlanPrice } from "@courselit/utils";
import { truncate } from "@ui-lib/utils";
import Image from "next/image";

export function ContentCard({ product }: { product: Course }) {
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
                        <div className="flex items-center gap-1 ascp">
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
                                {truncate(product.user?.name || "Unnamed", 30)}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
