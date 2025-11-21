import React from "react";
import { useState } from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import { Link } from "@courselit/components-library";
import { TextRenderer } from "../../components";
import { columns as defaultColumns } from "./defaults";
import {
    Button,
    Header1,
    PageCard,
    PageCardContent,
    PageCardHeader,
    Section,
    Subheader1,
    Text1,
    Text2,
    Switch,
} from "@courselit/page-primitives";
import { Preheader } from "@courselit/page-primitives";
import { ThemeStyle } from "@courselit/page-models";
import clsx from "clsx";

const twGridColsMap = {
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
};

export default function Widget({
    settings: {
        title,
        description,
        headerAlignment,
        items,
        maxWidth,
        verticalPadding,
        cssId,
        columns = defaultColumns,
        pricingSwitcher = false,
        monthlyPriceCaption,
        yearlyPriceCaption,
    },
    state: { theme },
}: WidgetProps<Settings>): JSX.Element {
    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.padding.y =
        verticalPadding || theme.theme.structure.section.padding.y;

    const [pricing, setPricing] = useState<"monthly" | "yearly">("yearly");

    return (
        <Section theme={overiddenTheme} id={cssId}>
            <div className={`flex flex-col gap-4`}>
                <div
                    className={`flex flex-col ${
                        headerAlignment === "center"
                            ? "items-center"
                            : "items-start"
                    }`}
                >
                    <Header1 className="mb-4" theme={overiddenTheme}>
                        {title}
                    </Header1>
                    {description && (
                        <div
                            className={`mb-4 ${
                                headerAlignment === "center"
                                    ? "text-center"
                                    : "text-left"
                            }`}
                        >
                            <Subheader1 theme={overiddenTheme} component="span">
                                <TextRenderer
                                    json={description}
                                    theme={overiddenTheme}
                                />
                            </Subheader1>
                        </div>
                    )}
                    {pricingSwitcher && (
                        <div className="flex items-center gap-2 mb-8 mt-4 text-lg w-full justify-center">
                            <div className="flex-1 text-right">
                                <Text2 theme={overiddenTheme}>
                                    {monthlyPriceCaption}
                                </Text2>
                            </div>
                            <div className="mt-1">
                                <Switch
                                    checked={pricing === "yearly"}
                                    onCheckedChange={(value: boolean) => {
                                        setPricing(
                                            value ? "yearly" : "monthly",
                                        );
                                    }}
                                />
                            </div>
                            <div className="flex-1">
                                <Text2 theme={overiddenTheme}>
                                    {yearlyPriceCaption}
                                </Text2>
                            </div>
                        </div>
                    )}
                </div>
                {items && items.length > 0 && (
                    <div
                        className={clsx(
                            "grid gap-4 justify-center items-stretch",
                            "grid-cols-1 md:grid-cols-2",
                            twGridColsMap[columns],
                        )}
                    >
                        {items.map((item, index) => (
                            <PageCard
                                key={index}
                                theme={overiddenTheme}
                                className=""
                            >
                                <PageCardContent
                                    className="h-full flex flex-col"
                                    theme={overiddenTheme}
                                >
                                    <Preheader
                                        className=""
                                        theme={overiddenTheme}
                                    >
                                        {item.title}
                                    </Preheader>
                                    <PageCardHeader theme={overiddenTheme}>
                                        {pricingSwitcher
                                            ? pricing === "yearly"
                                                ? item.priceYearly
                                                : item.price
                                            : item.price}
                                    </PageCardHeader>
                                    <div className="grow flex flex-col gap-4">
                                        <Text1
                                            component="span"
                                            theme={overiddenTheme}
                                        >
                                            <TextRenderer
                                                json={item.description}
                                                theme={overiddenTheme}
                                            />
                                        </Text1>
                                        <div className="grow">
                                            {item.features
                                                ?.split(",")
                                                .map((x) => x.trim())
                                                .map((feature) => (
                                                    <Text2
                                                        key={feature}
                                                        theme={overiddenTheme}
                                                        className="[&:not(:first-child)]:mt-4"
                                                    >
                                                        {feature}
                                                    </Text2>
                                                ))}
                                        </div>
                                        <Link
                                            href={
                                                pricing === "yearly" &&
                                                item.action.yearlyHref
                                                    ? item.action.yearlyHref
                                                    : item.action.href
                                            }
                                            className="w-full"
                                        >
                                            <Button
                                                className="w-full"
                                                variant={
                                                    item.primary
                                                        ? "default"
                                                        : "secondary"
                                                }
                                                theme={overiddenTheme}
                                            >
                                                {item.action.label}
                                            </Button>
                                        </Link>
                                    </div>
                                </PageCardContent>
                            </PageCard>
                        ))}
                    </div>
                )}
            </div>
        </Section>
    );
}
