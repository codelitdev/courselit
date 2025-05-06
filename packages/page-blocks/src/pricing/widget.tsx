import { useState } from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import { Link, Switch, TextRenderer } from "@courselit/components-library";
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
} from "@courselit/page-primitives";
import { Preheader } from "@courselit/page-primitives";

const twGridColsMap = {
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
};

export default function Widget({
    settings: {
        title,
        description,
        headerAlignment,
        backgroundColor,
        foregroundColor,
        items,
        maxWidth,
        verticalPadding,
        buttonBackground,
        buttonForeground,
        primaryButtonBackground,
        cardBorderColor,
        planTitleColor,
        cssId,
        columns = defaultColumns,
        pricingSwitcher = false,
        monthlyPriceCaption,
        yearlyPriceCaption,
    },
    state: { theme },
}: WidgetProps<Settings>): JSX.Element {
    const overiddenTheme = JSON.parse(JSON.stringify(theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.structure.page.width;
    overiddenTheme.structure.section.verticalPadding =
        verticalPadding || theme.structure.section.verticalPadding;

    const [pricing, setPricing] = useState<"monthly" | "yearly">("yearly");

    return (
        <Section
            theme={overiddenTheme}
            style={{
                backgroundColor: backgroundColor || theme?.colors?.background,
                color: foregroundColor || theme?.colors?.text,
            }}
            id={cssId}
        >
            <div className={`flex flex-col gap-4`}>
                <div
                    className={`flex flex-col ${
                        headerAlignment === "center"
                            ? "items-center"
                            : "items-start"
                    }`}
                >
                    <Header1 className="mb-4" theme={theme}>
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
                            <Subheader1 theme={theme}>
                                <TextRenderer json={description} />
                            </Subheader1>
                        </div>
                    )}
                    {pricingSwitcher && (
                        <div className="flex items-center gap-2 mb-8 mt-4 text-lg w-full justify-center">
                            <div className="flex-1 text-right">
                                <Text2 theme={theme}>
                                    {monthlyPriceCaption}
                                </Text2>
                            </div>
                            <div className="mt-1">
                                <Switch
                                    checked={pricing === "yearly"}
                                    onChange={(value: boolean) => {
                                        setPricing(
                                            value ? "yearly" : "monthly",
                                        );
                                    }}
                                />
                            </div>
                            <div className="flex-1">
                                <Text2 theme={theme}>
                                    {yearlyPriceCaption}
                                </Text2>
                            </div>
                        </div>
                    )}
                </div>
                {items && items.length > 0 && (
                    <div
                        className={`grid grid-cols-1 md:grid-cols-2 ${twGridColsMap[columns]} gap-4 justify-center items-stretch`}
                    >
                        {items.map((item, index) => (
                            <PageCard
                                key={index}
                                style={{
                                    backgroundColor,
                                    color: foregroundColor,
                                    border: `1px solid ${cardBorderColor || theme?.colors?.border}`,
                                }}
                                theme={theme}
                                className="p-0"
                            >
                                <PageCardContent>
                                    <Preheader
                                        className="pt-4"
                                        style={{
                                            color: planTitleColor,
                                        }}
                                        theme={theme}
                                    >
                                        {item.title}
                                    </Preheader>
                                    <PageCardHeader theme={theme}>
                                        {pricingSwitcher
                                            ? pricing === "yearly"
                                                ? item.priceYearly
                                                : item.price
                                            : item.price}
                                    </PageCardHeader>
                                    <div className="grow flex flex-col gap-4">
                                        <Text1
                                            style={{
                                                color: foregroundColor,
                                            }}
                                            component="span"
                                            theme={theme}
                                        >
                                            <TextRenderer
                                                json={item.description}
                                            />
                                        </Text1>
                                        <div className="">
                                            {item.features
                                                ?.split(",")
                                                .map((x) => x.trim())
                                                .map((feature) => (
                                                    <Text2
                                                        key={feature}
                                                        theme={theme}
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
                                                style={{
                                                    backgroundColor:
                                                        (item.primary
                                                            ? primaryButtonBackground
                                                            : buttonBackground) ||
                                                        theme?.colors?.primary,
                                                    color:
                                                        buttonForeground ||
                                                        "#fff",
                                                    borderColor: item.primary
                                                        ? ""
                                                        : cardBorderColor,
                                                }}
                                                variant={
                                                    item.primary
                                                        ? "default"
                                                        : "outline"
                                                }
                                                theme={theme}
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
