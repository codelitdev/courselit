import { useState } from "react";
import widgets from "@/ui-config/widgets";
import { Button } from "@courselit/components-library";
import AdminWidget from "./admin-widget";
import { State } from "@courselit/common-models";

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
    state: State;
}

export default function EditWidget({
    onChange,
    onClose,
    onDelete,
    widget,
    pageData,
    state,
}: EditWidgetProps) {
    const [deleteConfirmation, setDeleteConfirmation] = useState(false);
    const [hideActionButtons, setHideActionButtons] = useState(false);
    const [preservedStateAcrossRerender, setPreservedStateAcrossRerender] =
        useState<Record<string, unknown>>({});

    const actualWidget = widgets[widget.name];

    const onDeleteWidget = () => {
        if (!widget.deleteable) {
            return;
        }

        if (deleteConfirmation) {
            onDelete(widget.widgetId);
        } else {
            setDeleteConfirmation(true);
            setTimeout(() => setDeleteConfirmation(false), 2000);
        }
    };

    return (
        <div>
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
