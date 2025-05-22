import React from "react";
import { FormEvent, useState, useEffect } from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import {
    DEFAULT_BTN_TEXT,
    DEFAULT_FAILURE_MESSAGE,
    DEFAULT_SUCCESS_MESSAGE,
    DEFAULT_TITLE,
} from "./constants";
import { Form, useToast } from "@courselit/components-library";
import {
    Subheader1,
    Text1,
    Button,
    Input,
    Label,
    Section,
    Header1,
} from "@courselit/page-primitives";
import Script from "next/script";
import { ThemeStyle } from "@courselit/page-models";

const Widget = ({
    settings: {
        title,
        subtitle = "Sign up here to get the latest articles, news and updates.",
        btnText,
        backgroundColor,
        foregroundColor,
        btnBackgroundColor,
        btnForegroundColor,
        alignment = "left",
        successMessage,
        failureMessage,
        cssId,
        maxWidth,
        verticalPadding,
    },
    state,
    dispatch,
    editing,
    id,
}: WidgetProps<Settings>): JSX.Element => {
    const { theme } = state;
    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.padding.y =
        verticalPadding || theme.theme.structure.section.padding.y;

    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [turnstileToken, setTurnstileToken] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const justifyContent =
        alignment === "center"
            ? "center"
            : alignment === "right"
              ? "flex-end"
              : "flex-start";

    useEffect(() => {
        if (!editing && state.config.turnstileSiteKey) {
            const callbackName = `turnstileCallback_${id}`;
            (window as any)[callbackName] = (token: string) => {
                setTurnstileToken(token);
            };
        }
    }, [state.config.turnstileSiteKey, editing, id]);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (!editing && state.config.turnstileSiteKey) {
            const payload = JSON.stringify({ token: turnstileToken });
            const verificationFetch = new FetchBuilder()
                .setUrl(`${state.address.backend}/api/cloudflare`)
                .setHeaders({
                    "Content-Type": "application/json",
                })
                .setPayload(payload)
                .build();
            const response = await verificationFetch.exec();
            if (!response.success) {
                setErrorMessage("Could not verify that you are a human.");
                setIsSubmitting(false);
                return;
            }
        }

        const mutation = `
            mutation {
                response: createSubscription(name: "${name}" email: "${email}")
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
                toast({
                    title: "Success",
                    description: successMessage || DEFAULT_SUCCESS_MESSAGE,
                });
                setName("");
                setEmail("");
            } else {
                toast({
                    title: "Error",
                    description: failureMessage || DEFAULT_FAILURE_MESSAGE,
                });
            }
        } catch (e) {
            console.error(e.message);
        } finally {
            dispatch(actionCreators.networkAction(false));
            setIsSubmitting(false);
        }
    };

    return (
        <Section
            theme={overiddenTheme}
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
            id={cssId}
        >
            <Form
                onSubmit={onSubmit}
                className={`flex flex-col gap-4`}
                style={{
                    alignItems: justifyContent,
                }}
            >
                <Header1 theme={overiddenTheme} className="mb-4">
                    {title || DEFAULT_TITLE}
                </Header1>
                {subtitle && (
                    <Subheader1 theme={overiddenTheme} className="mb-4">
                        {subtitle}
                    </Subheader1>
                )}
                {errorMessage && (
                    <Text1 theme={overiddenTheme}>{errorMessage}</Text1>
                )}
                <div
                    className="flex flex-col md:!flex-row md:!items-end gap-2 w-full"
                    style={{
                        justifyContent,
                    }}
                >
                    <div className="flex flex-col gap-1">
                        <Label
                            theme={overiddenTheme}
                            htmlFor="name"
                            className="font-medium"
                        >
                            Name
                        </Label>
                        <Input
                            theme={overiddenTheme}
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                            type="text"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label
                            theme={overiddenTheme}
                            htmlFor="email"
                            className="font-medium"
                        >
                            Email
                        </Label>
                        <Input
                            theme={overiddenTheme}
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            type="email"
                            required
                        />
                    </div>
                    {!editing && state.config.turnstileSiteKey && (
                        <>
                            <Script
                                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                                async={true}
                                defer={true}
                                id="cloudflare-turnstile"
                            ></Script>
                            <span
                                className="cf-turnstile"
                                data-sitekey={state.config.turnstileSiteKey}
                                data-callback={`turnstileCallback_${id}`}
                            />
                        </>
                    )}
                    <Button
                        theme={overiddenTheme}
                        style={{
                            backgroundColor: btnBackgroundColor,
                            color: btnForegroundColor,
                        }}
                        disabled={
                            !editing &&
                            (isSubmitting ||
                                !name ||
                                !email ||
                                (state.config.turnstileSiteKey &&
                                    !turnstileToken))
                        }
                        type="submit"
                    >
                        {btnText || DEFAULT_BTN_TEXT}
                    </Button>
                </div>
            </Form>
        </Section>
    );
};

export default Widget;
