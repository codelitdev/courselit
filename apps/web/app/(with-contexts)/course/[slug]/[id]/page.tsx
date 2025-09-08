"use client";

import { useContext, useEffect, useState } from "react";
import {
    isEnrolled,
} from "@ui-lib/utils";
import { ArrowRight } from "@courselit/icons";
import {
    COURSE_PROGRESS_START,
    ENROLL_BUTTON_TEXT,
} from "@ui-config/strings";
import { checkPermission } from "@courselit/utils";
import {
    Course,
    Profile,
    UIConstants,
} from "@courselit/common-models";
import { Article } from "@components/public/article";
import {
    Link,
    Button2,
    getSymbolFromCurrency,
} from "@courselit/components-library";
import { AddressContext, ProfileContext, SiteInfoContext } from "@components/contexts";
import { getProduct } from "./helpers";
const { permissions } = UIConstants;

export default function ProductPage({ params }: { params: { slug: string, id: string } }) {
    const { id } = params;
    const [product, setProduct] = useState<any>(null);
    const { profile } = useContext(ProfileContext);
    const siteInfo = useContext(SiteInfoContext);
    const address = useContext(AddressContext);

    useEffect(() => {
        if (id) {
            getProduct(id, address.backend)
                .then((product) => {
                    setProduct(product);
                });
        }
    }, [id])

    if (!profile) {
        return null;
    }

    if (!product || !siteInfo) {
        return null;
    }

    return (
        <div className="flex flex-col pb-[100px] lg:max-w-[40rem] xl:max-w-[48rem] mx-auto">
            <h1 className="text-4xl font-semibold mb-8">
                {product.title}
            </h1>
            {JSON.stringify(profile)}
            {(!isEnrolled(product.courseId, profile as Profile) &&
                checkPermission(profile.permissions ?? [], [
                    permissions.enrollInCourse,
                ])) && (
                    <div>
                        <div className="flex justify-between items-center">
                            <div className="font-medium flex items-center">
                                {getSymbolFromCurrency(
                                    siteInfo.currencyISOCode ?? "",
                                )}
                                {product.cost}
                                <span className="text-sm text-muted-foreground ml-1">
                                    {product.costType ?? ""}
                                </span>
                            </div>
                            <Link
                                href={`/checkout?type=course&id=${product.courseId}`}
                            >
                                <Button2>{ENROLL_BUTTON_TEXT}</Button2>
                            </Link>
                        </div>
                    </div>
                )}
            <Article
                course={product as unknown as Course}
                options={{ hideTitle: true }}
                profile={profile as Profile}
                siteInfo={siteInfo}
            />
            {isEnrolled(product.courseId, profile as Profile) && (
                <div className="self-end">
                    <Link
                        href={`/course/${product.slug}/${product.courseId}/${product.firstLesson}`}
                    >
                        <Button2 className="flex gap-1 items-center">
                            {COURSE_PROGRESS_START}
                            <ArrowRight />
                        </Button2>
                    </Link>
                </div>
            )}
        </div>
    )
}