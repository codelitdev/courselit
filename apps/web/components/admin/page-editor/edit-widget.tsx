import { useState } from "react";
import widgets from "../../../ui-config/widgets";
import { AppDispatch, AppState } from "@courselit/state-management";
import { Cross as Close } from "@courselit/icons";
import AdminWidget from "./admin-widget";
import { IconButton, Button } from "@courselit/components-library";

interface EditWidgetProps {
    onChange: (widgetId: string, settings: Record<string, unknown>) => void;
    onClose: (...args: any[]) => void;
    onDelete: (widgetId: string) => void;
    widget: {
        name: string;
        settings?: Record<string, unknown>;
        widgetId: string;
        deleteable: boolean;
    };
    pageData: Record<string, unknown>;
    state: AppState;
    dispatch: AppDispatch;
}

export default function EditWidget({
    onChange,
    onClose,
    onDelete,
    widget,
    pageData,
    state,
    dispatch,
}: EditWidgetProps) {
    const [deleteConfirmation, setDeleteConfirmation] = useState(false);
    const [hideActionButtons, setHideActionButtons] = useState(false);
    const actualWidget = widgets[widget.name];
    const [preservedStateAcrossRerender, setPreservedStateAcrossRerender] =
        useState<Record<string, unknown>>({});

    const onDeleteWidget = () => {
        if (deleteConfirmation) {
            onDelete(widget.widgetId);
            onClose();
        } else {
            setDeleteConfirmation(true);
        }
    };

    return (
        <div className="flex flex-col">
            <li className="flex items-center px-2 py-3 justify-between">
                <h2 className="text-lg font-medium">
                    {actualWidget && actualWidget.metadata.displayName}
                    {!actualWidget && widget.name}
                </h2>
                <IconButton onClick={onClose} variant="soft">
                    <Close fontSize="small" />
                </IconButton>
            </li>
            {actualWidget && (
                <div className="px-2">
                    <AdminWidget
                        name={widget.name}
                        settings={widget.settings || {}}
                        onChange={(e: Record<string, unknown>) => {
                            onChange(widget.widgetId, e);
                        }}
                        hideActionButtons={(
                            e: boolean,
                            state: Record<string, unknown>,
                        ) => {
                            setHideActionButtons(e);
                            setPreservedStateAcrossRerender(state);
                        }}
                        preservedStateAcrossRerender={
                            preservedStateAcrossRerender
                        }
                        pageData={pageData}
                        state={state}
                        dispatch={dispatch}
                    />
                    {!hideActionButtons && (
                        <div
                            className={`flex mb-8 ${
                                widget.deleteable
                                    ? "justify-between"
                                    : "justify-end"
                            }`}
                        >
                            {widget.deleteable && (
                                <Button
                                    color="error"
                                    onClick={onDeleteWidget}
                                    variant="soft"
                                >
                                    {deleteConfirmation
                                        ? "Sure?"
                                        : "Delete block"}
                                </Button>
                            )}
                            <Button onClick={onClose}>Done</Button>
                        </div>
                    )}
                </div>
            )}
            {!actualWidget && <p>{widget.name} not found</p>}
        </div>
    );
}
