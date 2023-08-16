import React, { FormEvent, useState } from "react";
import { AppMessage, WidgetProps } from "@courselit/common-models";
import { Image, PriceTag, TextRenderer } from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import { Button, TextField } from "@mui/material";
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

    let direction: "row" | "row-reverse" | "column" | "column-reverse";
    switch (alignment) {
        case "top":
            direction = "column-reverse";
            break;
        case "bottom":
            direction = "column";
            break;
        case "left":
            direction = "row";
            break;
        case "right":
            direction = "row-reverse";
            break;
        default:
            direction = "row";
    }
    const verticalLayout = ["top", "bottom"].includes(alignment);
    const showEditingView =
        typeof editingViewShowSuccess === "undefined"
            ? 0
            : editingViewShowSuccess;

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
                    new AppMessage(failureMessage || DEFAULT_FAILURE_MESSAGE)
                )
            );
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    return (
        <div
            className="flex space-between"
            style={{
                flexDirection: direction,
                alignItems: !verticalLayout ? "center" : "",
                backgroundColor,
            }}
        >
            {product.featuredImage && (
                <div
                    className={`p-4 text-center ${
                        verticalLayout ? "md:w-full" : "w-1/2"
                    }`}
                >
                    <Image
                        src={(product.featuredImage as any).file}
                        width={verticalLayout ? "100%" : 1}
                        height={
                            verticalLayout
                                ? {
                                      xs: 224,
                                      sm: 300,
                                      md: 384,
                                      lg: 590,
                                  }
                                : {
                                      xs: 224,
                                      sm: 352,
                                      md: 214,
                                      lg: 286,
                                  }
                        }
                    />
                </div>
            )}
            <div
                className={`p-4 ${verticalLayout ? "md:w-full" : "w-1/2"}`}
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
                                currencyISOCode={state.siteinfo.currencyISOCode}
                            />
                        </div>
                    )}
                    <div className="pb-1">
                        <h1 className="text-4xl mb-4">
                            {/* @ts-ignore */}
                            {title ||
                                (type === "site"
                                    ? state.siteinfo.title
                                    : product.title)}
                        </h1>
                    </div>
                    {(description || product.description) && (
                        <div
                            className={`pb-4 ${
                                textAlignment === "center"
                                    ? "text-center"
                                    : "text-left"
                            }`}
                        >
                            <TextRenderer
                                json={
                                    description ||
                                    (product.description &&
                                        JSON.parse(
                                            product.description as string
                                        ))
                                }
                            />
                        </div>
                    )}
                    {type === "product" && product.costType === "email" && (
                        <div>
                            {((editing && showEditingView === 1) ||
                                success) && (
                                <TextRenderer
                                    json={
                                        successMessage || defaultSuccessMessage
                                    }
                                />
                            )}
                            {(!editing || (editing && showEditingView === 0)) &&
                                !success && (
                                    <form
                                        className="flex flex-col"
                                        onSubmit={onSubmit}
                                    >
                                        <div className="mb-4">
                                            <TextField
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
                                            <Button
                                                sx={{
                                                    backgroundColor:
                                                        buttonBackground,
                                                    color: buttonForeground,
                                                }}
                                                type="submit"
                                                disabled={state.networkAction}
                                                size="large"
                                                variant="contained"
                                            >
                                                {buttonCaption ||
                                                    "Get for free"}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                        </div>
                    )}
                    {type === "product" &&
                        ["paid", "free"].includes(
                            product.costType as string
                        ) && (
                            <Button
                                component="a"
                                href={`/checkout/${product.courseId}`}
                                variant="contained"
                                size="large"
                                sx={{
                                    backgroundColor: buttonBackground,
                                    color: buttonForeground,
                                }}
                            >
                                {buttonCaption || "Buy now"}
                            </Button>
                        )}
                    {type === "site" && buttonAction && (
                        <Button
                            component="a"
                            href={buttonAction}
                            variant="contained"
                            size="large"
                        >
                            {buttonCaption || "Set a URL"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
