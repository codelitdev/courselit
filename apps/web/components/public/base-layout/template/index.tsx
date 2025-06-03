import React, { Fragment, ReactNode } from "react";
import { WidgetInstance } from "@courselit/common-models";
import { Footer, Header } from "@courselit/page-blocks";
import { Toaster } from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import { HSL } from "color-convert";
import EditableWidget from "./editable-widget";
import { generateThemeStyles } from "@/lib/theme-styles";
import { Theme } from "@courselit/page-models";

type PageData = Record<string, unknown> & {
    pageType?: "product" | "site" | "blog" | "community";
};

interface TemplateProps {
    layout: Partial<WidgetInstance>[];
    pageData: PageData;
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
        <div className="flex flex-col font-primary courselit-theme">
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
                <div className="min-h-screen bg-background">
                    {children}
                    {pageWidgets}
                </div>
            )}
            {!childrenOnTop && (
                <div className="min-h-screen bg-background">
                    {pageWidgets}
                    {children}
                </div>
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
            <style>{generateThemeStyles(state.theme as Theme)}</style>
        </div>
    );
};

export default Template;

function formatHSL(hsl: HSL): string {
    return `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`;
}
