import { useState } from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import { Link, Switch, TextRenderer } from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    columns as defaultColumns,
} from "./defaults";
import {
    Button,
    Header1,
    Header2,
    PageCard,
    PageCardContent,
    PageCardHeader,
    Subheader1,
    Text2,
} from "@courselit/page-primitives";

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
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
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
    const [pricing, setPricing] = useState<"monthly" | "yearly">("yearly");

    return (
        <section
            className={`py-[${verticalPadding}px]`}
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
            id={cssId}
        >
            <div className="mx-auto lg:max-w-[1200px]">
                <div
                    className={`flex flex-col px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%]`}
                >
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
                                        borderColor: cardBorderColor,
                                    }}
                                >
                                    <PageCardContent>
                                        <PageCardHeader>
                                            <p
                                                className="font-semibold"
                                                style={{
                                                    color: planTitleColor,
                                                }}
                                            >
                                                {item.title}
                                            </p>
                                            <Header2 className="text-3xl">
                                                {pricingSwitcher
                                                    ? pricing === "yearly"
                                                        ? item.priceYearly
                                                        : item.price
                                                    : item.price}
                                            </Header2>
                                            <span
                                                className="text-sm"
                                                style={{
                                                    color: foregroundColor,
                                                }}
                                            >
                                                <TextRenderer
                                                    json={item.description}
                                                />
                                            </span>
                                        </PageCardHeader>
                                        <div className="grow flex flex-col gap-4">
                                            {item.features
                                                ?.split(",")
                                                .map((x) => x.trim())
                                                .map((feature) => (
                                                    <div
                                                        className="flex items-center gap-2 text-sm"
                                                        key={feature}
                                                    >
                                                        {feature}
                                                    </div>
                                                ))}
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
                                                            theme?.colors
                                                                ?.primary,
                                                        color:
                                                            buttonForeground ||
                                                            "#fff",
                                                        borderColor:
                                                            item.primary
                                                                ? ""
                                                                : cardBorderColor,
                                                    }}
                                                    variant={
                                                        item.primary
                                                            ? "default"
                                                            : "outline"
                                                    }
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
            </div>
        </section>
    );
}
