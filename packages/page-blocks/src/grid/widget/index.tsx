import { WidgetProps } from "@courselit/common-models";
import Settings from "../settings";
import { TextRenderer, Link } from "@courselit/components-library";
import Itemm from "./item";
import { columns as defaultColumns } from "../defaults";
import {
    Header1,
    Button,
    Subheader1,
    Section,
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
        itemsAlignment,
        buttonCaption,
        buttonAction,
        buttonBackground,
        buttonForeground,
        backgroundColor,
        foregroundColor,
        items,
        itemBackgroundColor,
        itemForegroundColor,
        itemBorderColor,
        itemBorderRadius,
        cssId,
        columns = defaultColumns,
        maxWidth,
        verticalPadding,
    },
    state: { theme },
}: WidgetProps<Settings>): JSX.Element {
    const overiddenTheme = JSON.parse(JSON.stringify(theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.structure.page.width;
    overiddenTheme.structure.section.verticalPadding =
        verticalPadding || theme.structure.section.verticalPadding;

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
                            <Subheader1 theme={overiddenTheme}>
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
                                theme={overiddenTheme}
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
                                            buttonBackground={buttonBackground}
                                            buttonForeground={buttonForeground}
                                            alignment={itemsAlignment}
                                            backgroundColor={
                                                itemBackgroundColor
                                            }
                                            foregroundColor={
                                                itemForegroundColor
                                            }
                                            borderColor={itemBorderColor}
                                            borderRadius={itemBorderRadius}
                                            theme={overiddenTheme}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Section>
    );
}
