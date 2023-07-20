import { AppMessage, WidgetProps } from "@courselit/common-models";
import { Image, PriceTag, TextRenderer } from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import {
    Button,
    Grid,
    GridDirection,
    TextField,
    Typography,
} from "@mui/material";
import React, { FormEvent, useState } from "react";
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

    let direction: GridDirection;
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
                    new AppMessage(
                        failureMessage || DEFAULT_FAILURE_MESSAGE
                    )
                )
            );
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    return (
        <Grid
            container
            justifyContent="space-between"
            direction={direction}
            alignItems={!verticalLayout ? "center" : ""}
            sx={{
                backgroundColor,
            }}
        >
            {product.featuredImage && (
                <Grid
                    item
                    md={verticalLayout ? 12 : 6}
                    sx={{ p: 2, textAlign: "center", width: 1 }}
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
                </Grid>
            )}
            <Grid item md={verticalLayout ? 12 : 6} sx={{ p: 2, color }}>
                <Grid
                    container
                    direction="column"
                    alignItems={
                        textAlignment === "center" ? "center" : "flex-start"
                    }
                >
                    {type !== "site" && (
                        <Grid item sx={{ pb: 1 }}>
                            <PriceTag
                                cost={product.cost as number}
                                freeCostCaption="FREE"
                                currencyISOCode={state.siteinfo.currencyISOCode}
                            />
                        </Grid>
                    )}
                    <Grid item sx={{ pb: 1 }}>
                        <Typography variant="h2" sx={{ mb: 2 }}>
                            {title ||
                                (type === "site"
                                    ? state.siteinfo.title
                                    : product.title)}
                        </Typography>
                    </Grid>
                    {(description || product.description) && (
                        <Grid
                            item
                            sx={{
                                pb: 2,
                                textAlign:
                                    textAlignment === "center"
                                        ? "center"
                                        : "left",
                            }}
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
                        </Grid>
                    )}
                    {type === "product" && product.costType === "email" && (
                        <Grid item>
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
                                    <Grid
                                        container
                                        direction="column"
                                        component="form"
                                        onSubmit={onSubmit}
                                    >
                                        <Grid item sx={{ mb: 2 }}>
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
                                        </Grid>
                                        <Grid item>
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
                                        </Grid>
                                    </Grid>
                                )}
                        </Grid>
                    )}
                    {type === "product" &&
                        ["paid", "free"].includes(
                            product.costType as string
                        ) && (
                            <Grid item>
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
                            </Grid>
                        )}
                    {type === "site" && buttonAction && (
                        <Grid item>
                            <Button
                                component="a"
                                href={buttonAction}
                                variant="contained"
                                size="large"
                            >
                                {buttonCaption || "Set a URL"}
                            </Button>
                        </Grid>
                    )}
                </Grid>
            </Grid>
        </Grid>
    );
}
