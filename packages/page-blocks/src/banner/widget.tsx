import { FormEvent, useState } from "react";
import { Constants, Media, WidgetProps } from "@courselit/common-models";
import {
    Image,
    TextRenderer,
    Link,
    useToast,
    getSymbolFromCurrency,
} from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder, getPlanPrice } from "@courselit/utils";
import { DEFAULT_FAILURE_MESSAGE, DEFAULT_SUCCESS_MESSAGE } from "./constants";
import Settings from "./settings";
import { Users } from "lucide-react";
import {
    Button,
    Header1,
    Input,
    Label,
    Preheader,
    Text2,
    Subheader1,
} from "@courselit/page-primitives";

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
    const { theme } = state;
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
                                <Preheader theme={theme}>
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
                                </Preheader>
                            )}
                        <div className="pb-1 mb-4">
                            <Header1 theme={theme}>{titleText}</Header1>
                        </div>
                        {finalDescription && (
                            <div
                                className={`pb-4 ${
                                    textAlignment === "center"
                                        ? "text-center"
                                        : "text-left"
                                }`}
                            >
                                <Subheader1 theme={theme}>
                                    <TextRenderer json={finalDescription} />
                                </Subheader1>
                            </div>
                        )}
                        {type === Constants.PageType.PRODUCT &&
                            isLeadMagnet && (
                                <div>
                                    {((editing && showEditingView === "1") ||
                                        success) && (
                                        <Subheader1 theme={theme}>
                                            <TextRenderer
                                                json={
                                                    successMessage ||
                                                    defaultSuccessMessage
                                                }
                                            />
                                        </Subheader1>
                                    )}
                                    {(!editing ||
                                        (editing && showEditingView === "0")) &&
                                        !success && (
                                            <form
                                                className="flex flex-col items-start gap-2"
                                                onSubmit={onSubmit}
                                            >
                                                <Label
                                                    theme={theme}
                                                    htmlFor="email"
                                                >
                                                    Email
                                                </Label>
                                                <Input
                                                    theme={theme}
                                                    value={email}
                                                    onChange={(e) =>
                                                        setEmail(e.target.value)
                                                    }
                                                    placeholder="Enter your email"
                                                    type="email"
                                                    required
                                                />
                                                <Button
                                                    theme={theme}
                                                    style={{
                                                        backgroundColor:
                                                            buttonBackground ||
                                                            theme?.colors
                                                                ?.primary,
                                                        color:
                                                            buttonForeground ||
                                                            "#fff",
                                                    }}
                                                    type="submit"
                                                    disabled={
                                                        state.networkAction ||
                                                        !email
                                                    }
                                                >
                                                    {buttonCaption ||
                                                        "Get for free"}
                                                </Button>
                                            </form>
                                        )}
                                </div>
                            )}
                        {type === Constants.PageType.PRODUCT &&
                            !isLeadMagnet && (
                                <Link
                                    href={`/checkout?type=course&id=${product.courseId}`}
                                >
                                    <Button
                                        theme={theme}
                                        style={{
                                            backgroundColor:
                                                buttonBackground ||
                                                theme?.colors?.primary,
                                            color: buttonForeground || "#fff",
                                        }}
                                    >
                                        {buttonCaption || "Buy now"}
                                    </Button>
                                </Link>
                            )}
                        {type === Constants.PageType.SITE && buttonAction && (
                            <Link href={buttonAction}>
                                <Button
                                    theme={theme}
                                    style={{
                                        backgroundColor:
                                            buttonBackground ||
                                            theme?.colors?.primary,
                                        color: buttonForeground || "#fff",
                                    }}
                                >
                                    {buttonCaption || "Set a URL"}
                                </Button>
                            </Link>
                        )}
                        {type === Constants.PageType.COMMUNITY && (
                            <div className="flex flex-col gap-4">
                                <Text2
                                    theme={theme}
                                    className="flex items-center gap-1"
                                >
                                    <>
                                        <Users className="w-4 h-4" />{" "}
                                        {product.membersCount} members
                                    </>
                                </Text2>
                                <Link
                                    href={`/checkout?type=community&id=${product.communityId}`}
                                >
                                    <Button
                                        theme={theme}
                                        style={{
                                            backgroundColor:
                                                buttonBackground ||
                                                theme?.colors?.primary,
                                            color: buttonForeground || "#fff",
                                        }}
                                    >
                                        {buttonCaption || "Join community"}
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
