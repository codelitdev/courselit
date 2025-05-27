import React, { Fragment, ReactNode } from "react";
import WidgetByName from "./widget-by-name";
import { WidgetInstance } from "@courselit/common-models";
import { Footer, Header } from "@courselit/page-blocks";
import { ArrowDown, Plus, ArrowUp } from "lucide-react";
import { Toaster } from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import { Tooltip } from "@courselit/components-library";
import { Button } from "@/components/ui/button";
import convert, { HSL } from "color-convert";

interface TemplateProps {
    layout: WidgetInstance[];
    pageData: Record<string, unknown>;
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
    colorMode?: "light" | "dark";
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
        colorMode,
    } = props;
    const theme =
        colorMode === "dark"
            ? state.theme?.theme?.colors?.dark
            : state.theme?.theme?.colors?.light;

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
            <style jsx>{`
                #${id} {
                    --background: ${theme?.background
                        ? formatHSL(
                              convert.hex.hsl(
                                  theme.background?.replace("#", ""),
                              ),
                          )
                        : ""};
                    --foreground: ${theme?.foreground
                        ? formatHSL(
                              convert.hex.hsl(
                                  theme.foreground?.replace("#", ""),
                              ),
                          )
                        : ""};
                    --card: ${theme?.card
                        ? formatHSL(
                              convert.hex.hsl(theme.card?.replace("#", "")),
                          )
                        : ""};
                    --card-foreground: ${theme?.cardForeground
                        ? formatHSL(
                              convert.hex.hsl(
                                  theme.cardForeground?.replace("#", ""),
                              ),
                          )
                        : ""};
                    --primary: ${theme?.primary
                        ? formatHSL(
                              convert.hex.hsl(theme.primary?.replace("#", "")),
                          )
                        : ""};
                    --primary-foreground: ${theme?.primaryForeground
                        ? formatHSL(
                              convert.hex.hsl(
                                  theme.primaryForeground?.replace("#", ""),
                              ),
                          )
                        : ""};
                    --secondary: ${theme?.secondary
                        ? formatHSL(
                              convert.hex.hsl(
                                  theme.secondary?.replace("#", ""),
                              ),
                          )
                        : ""};
                    --secondary-foreground: ${theme?.secondaryForeground
                        ? formatHSL(
                              convert.hex.hsl(
                                  theme.secondaryForeground?.replace("#", ""),
                              ),
                          )
                        : ""};
                    --muted: ${theme?.muted
                        ? formatHSL(
                              convert.hex.hsl(theme.muted?.replace("#", "")),
                          )
                        : ""};
                    --muted-foreground: ${theme?.mutedForeground
                        ? formatHSL(
                              convert.hex.hsl(
                                  theme.mutedForeground?.replace("#", ""),
                              ),
                          )
                        : ""};
                    --accent: ${theme?.accent
                        ? formatHSL(
                              convert.hex.hsl(theme.accent?.replace("#", "")),
                          )
                        : ""};
                    --accent-foreground: ${theme?.accentForeground
                        ? formatHSL(
                              convert.hex.hsl(
                                  theme.accentForeground?.replace("#", ""),
                              ),
                          )
                        : ""};
                    --border: ${theme?.border
                        ? formatHSL(
                              convert.hex.hsl(theme.border?.replace("#", "")),
                          )
                        : ""};
                    --destructive: ${theme?.destructive
                        ? formatHSL(
                              convert.hex.hsl(
                                  theme.destructive?.replace("#", ""),
                              ),
                          )
                        : ""};
                    --input: ${theme?.input
                        ? formatHSL(
                              convert.hex.hsl(theme.input?.replace("#", "")),
                          )
                        : ""};
                }
            `}</style>
        </div>
    );
};

export default Template;

function formatHSL(hsl: HSL): string {
    return `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`;
}

const EditableWidget = ({
    item,
    pageData,
    editing,
    onEditClick,
    allowsUpwardMovement = false,
    allowsDownwardMovement = false,
    allowsWidgetAddition = false,
    index,
    onAddWidgetBelow,
    onMoveWidgetUp,
    onMoveWidgetDown,
    dispatch,
    state,
}: {
    item: Record<string, any>;
    pageData: Record<string, unknown>;
    editing: boolean;
    onEditClick?: (widgetId: string) => void;
    allowsDownwardMovement?: boolean;
    allowsUpwardMovement?: boolean;
    allowsWidgetAddition?: boolean;
    index: number;
    onAddWidgetBelow?: (index: number) => void;
    onMoveWidgetUp?: (index: number) => void;
    onMoveWidgetDown?: (index: number) => void;
    state: Partial<AppState>;
    dispatch?: AppDispatch;
}) => {
    if (editing) {
        return (
            <div
                onClick={() => onEditClick && onEditClick(item.widgetId)}
                className={`relative ${
                    editing ? "cursor-pointer" : "cursor-default"
                } group`}
            >
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <div className="text-white/90 border border-white/50 px-3 py-1.5 rounded text-sm font-medium">
                        Click to update
                    </div>
                </div>
                <WidgetByName
                    name={item.name}
                    settings={item.settings || {}}
                    pageData={pageData}
                    id={item.widgetId}
                    editing={true}
                    dispatch={dispatch}
                    state={state}
                />
                <div className="w-full justify-evenly hidden group-hover:flex absolute bottom-[-16px] z-30">
                    {allowsUpwardMovement && (
                        <Tooltip title="Move up">
                            <Button
                                size="icon"
                                className="bg-black text-white shadow-md hover:bg-black/90 h-8 w-8 rounded-full"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveWidgetUp && onMoveWidgetUp(index);
                                }}
                            >
                                <ArrowUp className="w-4 h-4" />
                            </Button>
                        </Tooltip>
                    )}
                    {allowsWidgetAddition && (
                        <Tooltip title="Add widget below">
                            <Button
                                size="icon"
                                className="bg-black text-white shadow-md hover:bg-black/90 h-8 w-8 rounded-full"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddWidgetBelow && onAddWidgetBelow(index);
                                }}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </Tooltip>
                    )}
                    {allowsDownwardMovement && (
                        <Tooltip title="Move down">
                            <Button
                                size="icon"
                                className="bg-black text-white shadow-md hover:bg-black/90 h-8 w-8 rounded-full"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveWidgetDown && onMoveWidgetDown(index);
                                }}
                            >
                                <ArrowDown className="w-4 h-4" />
                            </Button>
                        </Tooltip>
                    )}
                </div>
            </div>
        );
    }

    return (
        <WidgetByName
            name={item.name}
            settings={item.settings || {}}
            pageData={pageData}
            id={item.widgetId}
            dispatch={dispatch}
            state={state}
            editing={false}
        />
    );
};
