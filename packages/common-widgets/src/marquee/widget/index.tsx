import React from "react";
import { WidgetProps } from "@courselit/common-models";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    itemBorderColor as defaultItemBorderColor,
    itemBackgroundColor as defaultItemBackgroundColor,
    itemForegroundColor as defaultItemForegroundColor,
    backgroundColor as defaultBackgroundColor,
} from "../defaults";
import Settings, { Item } from "../settings";
import Marquee from "./marquee";
import { cn, Link } from "@courselit/components-library";

export default function Widget({
    settings: {
        items = [],
        scrollEffect,
        itemStyle,
        backgroundColor,
        fadeEffect,
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
        cssId,
    },
}: WidgetProps<Settings>) {
    const renderItem = (item: Item, index: number) => {
        const key = item.text || item.svgText || index;

        const component = (
            <>
                {item.svgText && (
                    <div
                        className="w-full h-[100px] flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: item.svgText }}
                    />
                )}
                {!item.svgText && item.text && (
                    <div className="text-center font-medium text-lg whitespace-nowrap">
                        {item.text}
                    </div>
                )}
            </>
        );

        return (
            <div
                key={key}
                className={cn(
                    "flex items-center justify-center mx-4 my-2 min-w-[200px] min-h-[100px] px-4 box-border",
                    itemStyle?.backgroundColor,
                )}
                style={{
                    backgroundColor:
                        itemStyle?.backgroundColor ||
                        defaultItemBackgroundColor,
                    color:
                        itemStyle?.foregroundColor ||
                        defaultItemForegroundColor,
                    border: `${itemStyle?.borderWidth}px solid ${itemStyle?.borderColor || defaultItemBorderColor}`,
                    borderRadius: `${itemStyle?.borderRadius}px`,
                    borderStyle: itemStyle?.borderStyle,
                }}
            >
                {item.href ? (
                    <Link
                        href={item.href}
                        openInSameTab={false}
                        className="w-full h-full flex items-center justify-center"
                    >
                        {component}
                    </Link>
                ) : (
                    component
                )}
            </div>
        );
    };

    return (
        <section
            className={`py-[${verticalPadding}px]`}
            style={{
                backgroundColor,
            }}
            id={cssId}
        >
            <div className="mx-auto lg:max-w-[1200px]">
                <div
                    className={`flex flex-col px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%]`}
                >
                    <div className="relative">
                        {fadeEffect?.enabled && (
                            <>
                                <div
                                    className="absolute top-0 bottom-0 left-0 z-10 pointer-events-none"
                                    style={{
                                        width: `${fadeEffect.width}px`,
                                        background: `linear-gradient(to right, ${backgroundColor || defaultBackgroundColor}, transparent)`,
                                    }}
                                />
                                <div
                                    className="absolute top-0 bottom-0 right-0 z-10 pointer-events-none"
                                    style={{
                                        width: `${fadeEffect.width}px`,
                                        background: `linear-gradient(to left, ${backgroundColor || defaultBackgroundColor}, transparent)`,
                                    }}
                                />
                            </>
                        )}
                        {items.length > 0 && (
                            <Marquee
                                direction={scrollEffect?.direction}
                                speed={scrollEffect?.speed}
                                pauseOnHover={scrollEffect?.pauseOnHover}
                            >
                                {items.map(renderItem)}
                            </Marquee>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
