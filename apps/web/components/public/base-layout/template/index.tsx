import React, { ReactNode } from "react";
import { Box, Button, Grid } from "@mui/material";
import WidgetByName from "./widget-by-name";
import AppToast from "../../../app-toast";
import { WidgetInstance } from "@courselit/common-models";
import { Footer, Header } from "@courselit/common-widgets";
import { ArrowDownward, ArrowUpward } from "@mui/icons-material";

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
            <Box
                onClick={() => onEditClick && onEditClick(item.widgetId)}
                sx={{
                    position: "relative",
                    "&:hover": {
                        cursor: editing ? "pointer" : "default",
                    },
                    "&:after": {
                        content: '""',
                        position: "absolute",
                        width: 1,
                        height: 1,
                        top: 0,
                        left: 0,
                        background: "rgba(0,0,0,0.2)",
                        opacity: 0,
                        transition: "all 0.5s",
                    },
                    "&:hover:after": {
                        opacity: 1,
                    },
                    "&:hover > .lol": {
                        display: "flex",
                    },
                }}
            >
                <WidgetByName
                    name={item.name}
                    settings={item.settings || {}}
                    pageData={pageData}
                    id={`widget${item._id}`}
                />
                <Grid
                    className="lol"
                    container
                    justifyContent="space-evenly"
                    sx={{
                        display: "none",
                        position: "absolute",
                        bottom: -16,
                        zIndex: 2,
                    }}
                >
                    {allowsUpwardMovement && (
                        <Grid item>
                            <Button
                                color="primary"
                                variant="contained"
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveWidgetUp(index);
                                }}
                                startIcon={<ArrowUpward />}
                            >
                                Move up
                            </Button>
                        </Grid>
                    )}
                    {allowsWidgetAddition && (
                        <Grid item>
                            <Button
                                color="primary"
                                variant="contained"
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddWidgetBelow(index);
                                }}
                            >
                                Add widget below{" "}
                            </Button>
                        </Grid>
                    )}
                    {allowsDownwardMovement && (
                        <Grid item>
                            <Button
                                color="primary"
                                variant="contained"
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveWidgetDown(index);
                                }}
                                endIcon={<ArrowDownward />}
                            >
                                Move down
                            </Button>
                        </Grid>
                    )}
                </Grid>
            </Box>
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
        (widget) => widget.name === Footer.metadata.name
    )[0];
    const header = layout.filter(
        (widget) => widget.name === Header.metadata.name
    )[0];
    const widgetsWithoutHeaderAndFooter = layout.filter(
        (widget) =>
            ![Header.metadata.name, Footer.metadata.name].includes(widget.name)
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
        )
    );
    return (
        <Grid container direction="column">
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
                <Grid
                    item
                    container
                    direction="column"
                    sx={{ minHeight: "80vh" }}
                >
                    <Grid item>{children}</Grid>
                    {pageWidgets}
                </Grid>
            )}
            {!childrenOnTop && (
                <Grid
                    item
                    container
                    direction="column"
                    sx={{ minHeight: "80vh" }}
                >
                    {pageWidgets}
                    <Grid item>{children}</Grid>
                </Grid>
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
        </Grid>
    );
};

export default Template;
