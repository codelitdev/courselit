import { WidgetProps } from "@courselit/common-models";
import Settings from "../settings";
import { TextRenderer, Button2, Link } from "@courselit/components-library";
import Itemm from "./item";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    columns as defaultColumns,
} from "../defaults";

const twGridColsMap = {
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
};

export default function Widget({
    settings: {
        title,
        description,
        headerAlignment,
        itemsAlignment,
        buttonCaption,
        buttonAction,
        buttonBackground,
        buttonForeground,
        backgroundColor,
        foregroundColor,
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
        items,
        itemBackgroundColor,
        itemForegroundColor,
        itemBorderColor,
        itemBorderRadius,
        cssId,
        columns = defaultColumns,
    },
}: WidgetProps<Settings>) {
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
                        {buttonAction && buttonCaption && (
                            <Link href={buttonAction} className="mb-12">
                                <Button2
                                    style={{
                                        backgroundColor: buttonBackground,
                                        color: buttonForeground,
                                    }}
                                >
                                    {buttonCaption}
                                </Button2>
                            </Link>
                        )}
                    </div>
                    {items && items.length > 0 && (
                        <>
                            <div
                                className={`grid grid-cols-1 md:grid-cols-2 ${twGridColsMap[columns]} gap-4`}
                            >
                                {items.map((item, index) => (
                                    <div key={index} className="flex flex-col">
                                        <div className="h-full">
                                            <Itemm
                                                item={item}
                                                buttonBackground={
                                                    buttonBackground
                                                }
                                                buttonForeground={
                                                    buttonForeground
                                                }
                                                alignment={itemsAlignment}
                                                backgroundColor={
                                                    itemBackgroundColor
                                                }
                                                foregroundColor={
                                                    itemForegroundColor
                                                }
                                                borderColor={itemBorderColor}
                                                borderRadius={itemBorderRadius}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
