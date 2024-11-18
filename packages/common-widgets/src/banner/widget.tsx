"use client";

import { FormEvent, useState } from "react";
import { AppMessage, Media, WidgetProps } from "@courselit/common-models";
import {
    Image,
    PriceTag,
    TextRenderer,
    Form,
    FormField,
    Button2,
    Link,
} from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import { DEFAULT_FAILURE_MESSAGE, DEFAULT_SUCCESS_MESSAGE } from "./constants";
import Settings from "./settings";

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
}: WidgetProps<Settings>) {
    const [email, setEmail] = useState("");
    const [success, setSuccess] = useState(false);
    const type = Object.keys(product).length === 0 ? "site" : "product";
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

    const actualDescription = description
        ? JSON.stringify({ type: "doc" }) === JSON.stringify(description) ||
          JSON.stringify({
              type: "doc",
              content: [
                  {
                      type: "paragraph",
                      attrs: { dir: null, ignoreBidiAutoUpdate: null },
                  },
              ],
          }) === JSON.stringify(description)
            ? product.description
                ? JSON.parse(product.description as string)
                : undefined
            : description
        : product.description
          ? JSON.parse(product.description as string)
          : undefined;

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
        type === "site"
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
            dispatch(
                setAppMessage(
                    new AppMessage(failureMessage || DEFAULT_FAILURE_MESSAGE),
                ),
            );
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

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
                        {type !== "site" && (
                            <div className="pb-1">
                                <PriceTag
                                    cost={product.cost as number}
                                    freeCostCaption="FREE"
                                    currencyISOCode={
                                        state.siteinfo.currencyISOCode
                                    }
                                />
                            </div>
                        )}
                        <div className="pb-1">
                            <h1 className="text-4xl mb-4">
                                {title ||
                                    (type === "site"
                                        ? state.siteinfo.title
                                        : product.title)}
                            </h1>
                        </div>
                        {actualDescription && (
                            <div
                                className={`pb-4 ${
                                    textAlignment === "center"
                                        ? "text-center"
                                        : "text-left"
                                }`}
                            >
                                <TextRenderer json={actualDescription} />
                            </div>
                        )}
                        {type === "product" && product.costType === "email" && (
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
                                                        setEmail(e.target.value)
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
                        {type === "product" &&
                            ["paid", "free"].includes(
                                product.costType as string,
                            ) && (
                                <Link href={`/checkout/${product.courseId}`}>
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
                        {type === "site" && buttonAction && (
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
                    </div>
                </div>
            </div>
        </section>
    );
}
