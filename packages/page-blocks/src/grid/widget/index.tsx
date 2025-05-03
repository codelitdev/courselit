import { WidgetProps } from "@courselit/common-models";
import Settings from "../settings";
import { TextRenderer, Link } from "@courselit/components-library";
import Itemm from "./item";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    columns as defaultColumns,
} from "../defaults";
import { Header1, Button, Subheader1 } from "@courselit/page-primitives";

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
    state: { theme },
}: WidgetProps<Settings>): JSX.Element {
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
                        {buttonAction && buttonCaption && (
                            <Link href={buttonAction} className="mb-12">
                                <Button
                                    style={{
                                        backgroundColor:
                                            buttonBackground ||
                                            theme?.colors?.primary,
                                        color: buttonForeground || "#fff",
                                    }}
                                    theme={theme}
                                    className="w-full"
                                >
                                    {buttonCaption}
                                </Button>
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
                                                theme={theme}
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
