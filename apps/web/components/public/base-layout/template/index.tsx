import React, { ReactNode } from "react";
import WidgetByName from "./widget-by-name";
import { WidgetInstance } from "@courselit/common-models";
import { Footer, Header } from "@courselit/page-blocks";
import { ArrowDown, Plus, ArrowUp } from "lucide-react";
import { Toaster } from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import { Tooltip } from "@courselit/components-library";
import { Button } from "@/components/ui/button";

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
        <div className="flex flex-col font-primary">
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
                <div className="flex flex-col min-h-[80vh]">
                    {children}
                    {pageWidgets}
                </div>
            )}
            {!childrenOnTop && (
                <div className="flex flex-col min-h-[80vh]">
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
        </div>
    );
};

export default Template;
