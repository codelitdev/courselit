"use client";

import { useContext, useEffect, useState, use } from "react";
import { isEnrolled } from "@ui-lib/utils";
import { ArrowRight } from "@courselit/icons";
import {
    COURSE_PROGRESS_START,
    ENROLL_BUTTON_TEXT,
    BTN_VIEW_CERTIFICATE,
} from "@ui-config/strings";
import { checkPermission } from "@courselit/utils";
import { Profile, UIConstants } from "@courselit/common-models";
import {
    Link,
    Button2,
    getSymbolFromCurrency,
    Image,
} from "@courselit/components-library";
import { TextRenderer } from "@courselit/page-blocks";
import { TableOfContent } from "@components/table-of-content";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
    ThemeContext,
} from "@components/contexts";
import { getProduct } from "./helpers";
import { getUserProfile } from "@/app/(with-contexts)/helpers";
import { BadgeCheck } from "lucide-react";
import { emptyDoc as TextEditorEmptyDoc } from "@courselit/text-editor";
import WidgetErrorBoundary from "@components/public/base-layout/template/widget-error-boundary";
const { permissions } = UIConstants;

export default function ProductPage(props: {
    params: Promise<{ slug: string; id: string }>;
}) {
    const params = use(props.params);
    const { id } = params;
    const [product, setProduct] = useState<any>(null);
    const { profile, setProfile } = useContext(ProfileContext);
    const siteInfo = useContext(SiteInfoContext);
    const address = useContext(AddressContext);
    const [progress, setProgress] = useState<any>(null);
    const { theme } = useContext(ThemeContext);

    useEffect(() => {
        if (id) {
            getProduct(id, address.backend).then((product) => {
                setProduct(product);
            });
        }
    }, [id]);

    useEffect(() => {
        if (product) {
            getUserProfile(address.backend).then((profile) => {
                setProfile(profile);
                setProgress(
                    profile.purchases?.find(
                        (purchase) => purchase.courseId === product.courseId,
                    ),
                );
            });
        }
    }, [product]);

    if (!profile) {
        return null;
    }

    if (!product || !siteInfo) {
        return null;
    }

    const descriptionJson = product.description
        ? JSON.parse(product.description)
        : TextEditorEmptyDoc;

    return (
        <div className="flex flex-col pb-[100px] lg:max-w-[40rem] xl:max-w-[48rem] mx-auto">
            <h1 className="text-4xl font-semibold mb-8">{product.title}</h1>
            {progress?.certificateId && (
                <Link
                    href={`/accomplishment/${progress.certificateId}`}
                    className="mb-4"
                >
                    <Button2>
                        <BadgeCheck className="h-4 w-4" />{" "}
                        {BTN_VIEW_CERTIFICATE}
                    </Button2>
                </Link>
            )}
            {!isEnrolled(product.courseId, profile as Profile) &&
                checkPermission(profile.permissions ?? [], [
                    permissions.enrollInCourse,
                ]) && (
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
            {product.featuredImage && (
                <div className="flex justify-center">
                    <div className="mt-4 mb-8 w-full md:max-w-screen-md">
                        <Image
                            alt={product.featuredImage.caption}
                            src={product.featuredImage.file!}
                            loading="eager"
                            sizes="50vw"
                        />
                    </div>
                </div>
            )}
            <div className="overflow-hidden min-h-[360px]">
                <div className="flex flex-col gap-4">
                    <TableOfContent
                        json={descriptionJson}
                        theme={theme.theme}
                    />
                    <WidgetErrorBoundary widgetName="text-editor">
                        <TextRenderer
                            json={descriptionJson}
                            theme={theme.theme}
                        />
                    </WidgetErrorBoundary>
                </div>
            </div>
            {isEnrolled(product.courseId, profile as Profile) &&
                product.firstLesson && (
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
    );
}
