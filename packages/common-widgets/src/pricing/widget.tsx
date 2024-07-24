"use client";

import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import {
    Button2,
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    Link,
    Switch,
    TextRenderer,
} from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    columns as defaultColumns,
} from "./defaults";
import { useState } from "react";

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
}: WidgetProps<Settings>) {
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
                        <h2 className="text-4xl mb-4">{title}</h2>
                        {description && (
                            <div
                                className={`mb-4 ${
                                    headerAlignment === "center"
                                        ? "text-center"
                                        : "text-left"
                                }`}
                            >
                                <TextRenderer json={description} />
                            </div>
                        )}
                        {pricingSwitcher && (
                            <div className="flex items-center gap-2 mb-8 mt-4 text-lg w-full justify-center">
                                <div className="flex-1 text-right">
                                    <p className="break-all">
                                        {monthlyPriceCaption}
                                    </p>
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
                                    <p className="break-all">
                                        {yearlyPriceCaption}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    {items && items.length > 0 && (
                        <div
                            className={`grid grid-cols-1 md:grid-cols-2 ${twGridColsMap[columns]} gap-4 justify-center items-stretch`}
                        >
                            {items.map((item, index) => (
                                <Card
                                    key={index}
                                    className="flex flex-col w-full"
                                    style={{
                                        backgroundColor,
                                        color: foregroundColor,
                                        borderColor: cardBorderColor,
                                    }}
                                >
                                    <CardHeader>
                                        <p
                                            className="font-semibold"
                                            style={{
                                                color: planTitleColor,
                                            }}
                                        >
                                            {item.title}
                                        </p>
                                        <CardTitle className="text-3xl">
                                            {pricingSwitcher
                                                ? pricing === "yearly"
                                                    ? item.priceYearly
                                                    : item.price
                                                : item.price}
                                        </CardTitle>
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
                                    </CardHeader>
                                    <CardContent className="grow flex flex-col gap-4">
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
                                    </CardContent>
                                    <CardFooter>
                                        <Link
                                            href={
                                                pricing === "yearly" &&
                                                item.action.yearlyHref
                                                    ? item.action.yearlyHref
                                                    : item.action.href
                                            }
                                            className="w-full"
                                        >
                                            <Button2
                                                className="w-full"
                                                style={{
                                                    backgroundColor:
                                                        item.primary
                                                            ? primaryButtonBackground
                                                            : buttonBackground,
                                                    color: buttonForeground,
                                                    borderColor: item.primary
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
                                            </Button2>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
