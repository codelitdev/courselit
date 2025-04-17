"use client";

import { FormEvent, useState } from "react";
import { Constants, Media, WidgetProps } from "@courselit/common-models";
import {
    Image,
    TextRenderer,
    Form,
    FormField,
    Button2,
    Link,
    useToast,
    getSymbolFromCurrency,
} from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder, getPlanPrice } from "@courselit/utils";
import { DEFAULT_FAILURE_MESSAGE, DEFAULT_SUCCESS_MESSAGE } from "./constants";
import Settings from "./settings";
import { Users } from "lucide-react";

function isEmptyDoc(description) {
    return (
        JSON.stringify({ type: "doc" }) === JSON.stringify(description) ||
        JSON.stringify({
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    attrs: { dir: null, ignoreBidiAutoUpdate: null },
                },
            ],
        }) === JSON.stringify(description)
    );
}

export default function Widget({
    settings: {
        title,
        description,
        buttonCaption,
        buttonAction,
        alignment,
        backgroundColor,
        color,
        buttonBackground,
        buttonForeground,
        textAlignment,
        successMessage,
        failureMessage,
        editingViewShowSuccess,
    },
    state,
    pageData: product,
    dispatch,
    editing,
}: WidgetProps<Settings>): JSX.Element {
    const [email, setEmail] = useState("");
    const [success, setSuccess] = useState(false);
    const { toast } = useToast();
    const type = product.pageType;
    const defaultSuccessMessage: Record<string, unknown> = {
        type: "doc",
        content: [
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: DEFAULT_SUCCESS_MESSAGE,
                    },
                ],
            },
        ],
    };

    let finalDescription: any = undefined;
    if (description && !isEmptyDoc(description)) {
        finalDescription = description;
    } else if (product.description && type === Constants.PageType.PRODUCT) {
        finalDescription = JSON.parse(product.description as string);
    } else if (product.description && type === Constants.PageType.COMMUNITY) {
        finalDescription = product.description;
    }

    // const actualDescription = description
    //     ? isEmptyDoc(description)
    //         ? product.description
    //             ? JSON.parse(product.description as string)
    //             : undefined
    //         : description
    //     : product.description
    //       ? JSON.parse(product.description as string)
    //       : undefined;

    let direction: any;
    switch (alignment) {
        case "top":
            direction = "md:!flex-col-reverse";
            break;
        case "bottom":
            direction = "md:!flex-col";
            break;
        case "left":
            direction = "md:!flex-row";
            break;
        case "right":
            direction = "md:!flex-row-reverse";
            break;
        default:
            direction = "md:!flex-row";
    }
    const verticalLayout = ["top", "bottom"].includes(alignment);
    const showEditingView =
        typeof editingViewShowSuccess === "undefined"
            ? "0"
            : editingViewShowSuccess;
    const featuredImage: Partial<Media> =
        type === Constants.PageType.SITE
            ? state.siteinfo.logo
            : (product.featuredImage as Partial<Media>);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const mutation = `
            mutation {
                response: sendCourseOverMail(
                    email: "${email}",
                    courseId: "${product.courseId}"
                )
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${state.address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.response) {
                setEmail("");
                setSuccess(true);
            }
        } catch (e) {
            toast({
                title: "Error",
                description: failureMessage || DEFAULT_FAILURE_MESSAGE,
                variant: "destructive",
            });
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    const isLeadMagnet =
        product.leadMagnet &&
        product.paymentPlans.length === 1 &&
        product.paymentPlans[0].type === Constants.PaymentPlanType.FREE;

    const titleText: string = (title ||
        (type === Constants.PageType.SITE
            ? state.siteinfo.title
            : type === Constants.PageType.PRODUCT
              ? product.title
              : product.name)) as string;

    return (
        <section
            style={{
                backgroundColor,
            }}
        >
            <div
                style={{
                    flexDirection: direction,
                    alignItems: !verticalLayout ? "center" : "",
                }}
                className={`flex flex-col space-between ${direction} mx-auto lg:max-w-[1200px]`}
            >
                {featuredImage && (
                    <div
                        className={`p-4 text-center ${
                            verticalLayout ? "md:w-full" : "w-full md:w-1/2"
                        }`}
                    >
                        <Image
                            src={featuredImage.file}
                            alt={featuredImage.caption}
                        />
                    </div>
                )}
                <div
                    className={`p-4 text-center ${
                        verticalLayout ? "md:w-full" : "w-full md:w-1/2"
                    }`}
                    style={{ color }}
                >
                    <div
                        className={`flex flex-col ${
                            textAlignment === "center"
                                ? "items-center"
                                : "items-start"
                        }`}
                    >
                        {type === Constants.PageType.PRODUCT &&
                            !isLeadMagnet && (
                                <div className="pb-1 font-medium">
                                    {getSymbolFromCurrency(
                                        state.siteinfo.currencyISOCode,
                                    )}
                                    {
                                        getPlanPrice(
                                            product.paymentPlans.find(
                                                (x) =>
                                                    x.planId ===
                                                    product.defaultPaymentPlan,
                                            ),
                                        ).amount
                                    }
                                    {/* <PriceTag
                                    cost={product.cost as number}
                                    freeCostCaption="FREE"
                                    currencyISOCode={
                                        state.siteinfo.currencyISOCode
                                    }
                                /> */}
                                </div>
                            )}
                        <div className="pb-1">
                            <h1 className="text-4xl mb-4">{titleText}</h1>
                        </div>
                        {finalDescription && (
                            <div
                                className={`pb-4 ${
                                    textAlignment === "center"
                                        ? "text-center"
                                        : "text-left"
                                }`}
                            >
                                <TextRenderer json={finalDescription} />
                            </div>
                        )}
                        {type === Constants.PageType.PRODUCT &&
                            isLeadMagnet && (
                                <div>
                                    {((editing && showEditingView === "1") ||
                                        success) && (
                                        <TextRenderer
                                            json={
                                                successMessage ||
                                                defaultSuccessMessage
                                            }
                                        />
                                    )}
                                    {(!editing ||
                                        (editing && showEditingView === "0")) &&
                                        !success && (
                                            <Form
                                                className="flex flex-col items-start"
                                                onSubmit={onSubmit}
                                            >
                                                <div className="mb-4">
                                                    <FormField
                                                        label="Email"
                                                        value={email}
                                                        onChange={(e) =>
                                                            setEmail(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Enter your email"
                                                        type="email"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <Button2
                                                        style={{
                                                            backgroundColor:
                                                                buttonBackground,
                                                            color: buttonForeground,
                                                        }}
                                                        type="submit"
                                                        disabled={
                                                            state.networkAction ||
                                                            !email
                                                        }
                                                    >
                                                        {buttonCaption ||
                                                            "Get for free"}
                                                    </Button2>
                                                </div>
                                            </Form>
                                        )}
                                </div>
                            )}
                        {type === Constants.PageType.PRODUCT &&
                            !isLeadMagnet && (
                                <Link
                                    href={`/checkout?type=course&id=${product.courseId}`}
                                >
                                    <Button2
                                        style={{
                                            backgroundColor: buttonBackground,
                                            color: buttonForeground,
                                        }}
                                    >
                                        {buttonCaption || "Buy now"}
                                    </Button2>
                                </Link>
                            )}
                        {type === Constants.PageType.SITE && buttonAction && (
                            <Link href={buttonAction}>
                                <Button2
                                    style={{
                                        backgroundColor: buttonBackground,
                                        color: buttonForeground,
                                    }}
                                >
                                    {buttonCaption || "Set a URL"}
                                </Button2>
                            </Link>
                        )}
                        {type === Constants.PageType.COMMUNITY && (
                            <div className="flex flex-col gap-4">
                                <span className="text-sm flex items-center gap-1 font-semibold">
                                    <>
                                        <Users className="w-4 h-4" />{" "}
                                        {product.membersCount} members
                                    </>
                                </span>
                                <Link
                                    href={`/checkout?type=community&id=${product.communityId}`}
                                >
                                    <Button2
                                        style={{
                                            backgroundColor: buttonBackground,
                                            color: buttonForeground,
                                        }}
                                    >
                                        {buttonCaption || "Join community"}
                                    </Button2>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
