import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings, { GraphicMediaAspectRatio, GridStyle } from "../settings";
import {
    DEFAULT_GRID_STYLE,
    getDefaultMediaAlignment,
    normalizeGraphicType,
    normalizeMediaAlignment,
} from "../normalizers";
import { Link } from "@courselit/components-library";
import { TextRenderer } from "../../../components";
import Itemm from "./item";
import { columns as defaultColumns } from "../defaults";
import {
    Header1,
    Button,
    Subheader1,
    Section,
} from "@courselit/page-primitives";
import { ThemeStyle } from "@courselit/page-models";

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
        items,
        cssId,
        columns = defaultColumns,
        maxWidth,
        verticalPadding,
        svgInline,
        svgStyle,
        style,
        graphicType = "media",
        mediaAlignment,
        graphicMediaAspectRatio,
    },
    state: { theme },
}: WidgetProps<Settings>): JSX.Element {
    const resolvedStyle: GridStyle = style || DEFAULT_GRID_STYLE;
    const resolvedGraphicType = normalizeGraphicType(
        resolvedStyle,
        graphicType,
    );
    const resolvedMediaAlignment = normalizeMediaAlignment(
        resolvedStyle,
        mediaAlignment || getDefaultMediaAlignment(resolvedStyle),
    );
    const resolvedGraphicMediaAspectRatio: GraphicMediaAspectRatio =
        graphicMediaAspectRatio ||
        (resolvedStyle === "mediacard" ? "16/9" : "1/1");

    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.padding.y =
        verticalPadding || theme.theme.structure.section.padding.y;

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
                    {buttonAction && buttonCaption && (
                        <Link href={buttonAction} className="mb-12">
                            <Button theme={overiddenTheme} className="w-full">
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
                                            alignment={itemsAlignment}
                                            theme={overiddenTheme}
                                            svgStyle={svgStyle}
                                            svgInline={svgInline}
                                            style={resolvedStyle}
                                            graphicType={resolvedGraphicType}
                                            graphicMediaAspectRatio={
                                                resolvedGraphicMediaAspectRatio
                                            }
                                            mediaAlignment={
                                                resolvedMediaAlignment
                                            }
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
