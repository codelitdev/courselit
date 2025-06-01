import React, { Fragment, ReactNode } from "react";
import { WidgetInstance } from "@courselit/common-models";
import { Footer, Header } from "@courselit/page-blocks";
import { Toaster } from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import convert, { HSL } from "color-convert";
import EditableWidget from "./editable-widget";

interface TemplateProps {
    layout: WidgetInstance[];
    pageData: Record<string, unknown> & {
        pageType: "product" | "site" | "blog" | "community";
    };
    editing?: boolean;
    onEditClick?: (widgetId: string) => void;
    children?: ReactNode;
    childrenOnTop: boolean;
    onAddWidgetBelow?: (index: number) => void;
    onMoveWidgetUp?: (index: number) => void;
    onMoveWidgetDown?: (index: number) => void;
    dispatch?: AppDispatch;
    state: Partial<AppState>;
    id?: string;
    injectThemeStyles?: boolean;
}

const Template = (props: TemplateProps) => {
    const {
        layout,
        pageData,
        editing = false,
        onEditClick,
        children,
        childrenOnTop = false,
        onAddWidgetBelow,
        onMoveWidgetUp,
        onMoveWidgetDown,
        dispatch,
        state,
        id,
        injectThemeStyles = false,
    } = props;
    const themeColors = state.theme?.theme?.colors;

    if (!layout) return <></>;
    const footer = layout.filter(
        (widget) => widget.name === Footer.metadata.name,
    )[0];
    const header = layout.filter(
        (widget) => widget.name === Header.metadata.name,
    )[0];
    const widgetsWithoutHeaderAndFooter = layout.filter(
        (widget) =>
            ![Header.metadata.name, Footer.metadata.name].includes(widget.name),
    );
    const pageWidgets = widgetsWithoutHeaderAndFooter.map(
        (item: any, index: number) => (
            <EditableWidget
                item={item}
                key={item.widgetId}
                editing={editing}
                onEditClick={onEditClick}
                pageData={pageData}
                allowsWidgetAddition={true}
                allowsUpwardMovement={index !== 0}
                allowsDownwardMovement={
                    widgetsWithoutHeaderAndFooter.length - 1 !== index
                }
                onAddWidgetBelow={onAddWidgetBelow}
                onMoveWidgetDown={onMoveWidgetDown}
                onMoveWidgetUp={onMoveWidgetUp}
                index={index + 1}
                dispatch={dispatch}
                state={state}
            />
        ),
    );

    return (
        <div className="flex flex-col font-primary" id={id}>
            {header && (
                <EditableWidget
                    item={header}
                    editing={editing}
                    pageData={pageData}
                    onEditClick={onEditClick}
                    allowsWidgetAddition={true}
                    onAddWidgetBelow={onAddWidgetBelow}
                    onMoveWidgetDown={onMoveWidgetDown}
                    onMoveWidgetUp={onMoveWidgetUp}
                    index={0}
                    dispatch={dispatch}
                    state={state}
                />
            )}
            {childrenOnTop && (
                <Fragment>
                    {children}
                    {pageWidgets}
                </Fragment>
            )}
            {!childrenOnTop && (
                <Fragment>
                    {pageWidgets}
                    {children}
                </Fragment>
            )}
            {footer && (
                <EditableWidget
                    item={footer}
                    pageData={pageData}
                    editing={editing}
                    onEditClick={onEditClick}
                    index={layout.length - 1}
                    dispatch={dispatch}
                    state={state}
                />
            )}
            <Toaster />
            {injectThemeStyles && (
                <style jsx global>{`
                    :root {
                        --background: ${themeColors?.light?.background
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.background?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --foreground: ${themeColors?.light?.foreground
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.foreground?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --card: ${themeColors?.light?.card
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.card?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --card-foreground: ${themeColors?.light?.cardForeground
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.cardForeground?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --primary: ${themeColors?.light?.primary
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.primary?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --primary-foreground: ${themeColors?.light
                            ?.primaryForeground
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.primaryForeground?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --secondary: ${themeColors?.light?.secondary
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.secondary?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --secondary-foreground: ${themeColors?.light
                            ?.secondaryForeground
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.secondaryForeground?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --muted: ${themeColors?.light?.muted
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.muted?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --muted-foreground: ${themeColors?.light
                            ?.mutedForeground
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.mutedForeground?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --accent: ${themeColors?.light?.accent
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.accent?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --accent-foreground: ${themeColors?.light
                            ?.accentForeground
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.accentForeground?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --border: ${themeColors?.light?.border
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.border?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --destructive: ${themeColors?.light?.destructive
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.destructive?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --input: ${themeColors?.light?.input
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.light?.input?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --shadow-2xs: ${themeColors?.light?.shadow2xs};
                        --shadow-xs: ${themeColors?.light?.shadowXs};
                        --shadow-sm: ${themeColors?.light?.shadowSm};
                        --shadow-md: ${themeColors?.light?.shadowMd};
                        --shadow-lg: ${themeColors?.light?.shadowLg};
                        --shadow-xl: ${themeColors?.light?.shadowXl};
                        --shadow-2xl: ${themeColors?.light?.shadow2xl};
                    }
                    .dark {
                        --background: ${themeColors?.dark?.background
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.background?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --foreground: ${themeColors?.dark?.foreground
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.foreground?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --card: ${themeColors?.dark?.card
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.card?.replace("#", ""),
                                  ),
                              )
                            : ""};
                        --card-foreground: ${themeColors?.dark?.cardForeground
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.cardForeground?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --primary: ${themeColors?.dark?.primary
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.primary?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --primary-foreground: ${themeColors?.dark
                            ?.primaryForeground
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.primaryForeground?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --secondary: ${themeColors?.dark?.secondary
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.secondary?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --secondary-foreground: ${themeColors?.dark
                            ?.secondaryForeground
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.secondaryForeground?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --muted: ${themeColors?.dark?.muted
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.muted?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --muted-foreground: ${themeColors?.dark?.mutedForeground
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.mutedForeground?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --accent: ${themeColors?.dark?.accent
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.accent?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --accent-foreground: ${themeColors?.dark
                            ?.accentForeground
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.accentForeground?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --border: ${themeColors?.dark?.border
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.border?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --destructive: ${themeColors?.dark?.destructive
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.destructive?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --input: ${themeColors?.dark?.input
                            ? formatHSL(
                                  convert.hex.hsl(
                                      themeColors?.dark?.input?.replace(
                                          "#",
                                          "",
                                      ),
                                  ),
                              )
                            : ""};
                        --shadow-2xs: ${themeColors?.dark?.shadow2xs};
                        --shadow-xs: ${themeColors?.dark?.shadowXs};
                        --shadow-sm: ${themeColors?.dark?.shadowSm};
                        --shadow-md: ${themeColors?.dark?.shadowMd};
                        --shadow-lg: ${themeColors?.dark?.shadowLg};
                        --shadow-xl: ${themeColors?.dark?.shadowXl};
                        --shadow-2xl: ${themeColors?.dark?.shadow2xl};
                    }
                `}</style>
            )}
        </div>
    );
};

export default Template;

function formatHSL(hsl: HSL): string {
    return `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`;
}
