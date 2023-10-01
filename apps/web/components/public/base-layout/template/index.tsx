import React, { ReactNode } from "react";
import WidgetByName from "./widget-by-name";
import AppToast from "../../../app-toast";
import { WidgetInstance } from "@courselit/common-models";
import { Footer, Header } from "@courselit/common-widgets";
import { ArrowDownward, ArrowUpward } from "@courselit/icons";
import { Button } from "@courselit/components-library";

interface TemplateProps {
    layout: WidgetInstance[];
    pageData: Record<string, unknown>;
    editing?: boolean;
    onEditClick?: (widgetId: string) => void;
    children?: ReactNode;
    childrenOnTop: boolean;
    onAddWidgetBelow: (index: number) => void;
    onMoveWidgetUp: (index: number) => void;
    onMoveWidgetDown: (index: number) => void;
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
}: {
    item: Record<string, any>;
    pageData: Record<string, unknown>;
    editing: boolean;
    onEditClick?: (widgetId: string) => void;
    allowsDownwardMovement?: boolean;
    allowsUpwardMovement?: boolean;
    allowsWidgetAddition?: boolean;
    index: number;
    onAddWidgetBelow: (index: number) => void;
    onMoveWidgetUp: (index: number) => void;
    onMoveWidgetDown: (index: number) => void;
}) => {
    if (editing) {
        return (
            <div
                onClick={() => onEditClick && onEditClick(item.widgetId)}
                className={`relative ${
                    editing ? "cursor-pointer" : "cursor-default"
                } after:content-[''] after:absolute after:w-full after:h-full after:top-0 after:left-0 after:bg-black/30 after:opacity-0 hover:after:opacity-100 group`}
            >
                <WidgetByName
                    name={item.name}
                    settings={item.settings || {}}
                    pageData={pageData}
                    id={`widget${item._id}`}
                    editing={editing}
                />
                <div className="w-full justify-evenly hidden group-hover:flex absolute bottom-[-16px] z-10">
                    {allowsUpwardMovement && (
                        <Button
                            component="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveWidgetUp(index);
                            }}
                        >
                            <ArrowUpward /> Move up
                        </Button>
                    )}
                    {allowsWidgetAddition && (
                        <Button
                            component="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddWidgetBelow(index);
                            }}
                        >
                            Add widget below{" "}
                        </Button>
                    )}
                    {allowsDownwardMovement && (
                        <Button
                            component="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveWidgetDown(index);
                            }}
                        >
                            Move down <ArrowDownward />
                        </Button>
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
            id={`widget${item._id}`}
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
                />
            )}
            <AppToast />
        </div>
    );
};

export default Template;
