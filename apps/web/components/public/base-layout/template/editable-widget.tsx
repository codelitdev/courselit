import {
    State,
    WidgetDefaultSettings,
    WidgetProps,
} from "@courselit/common-models";
import WidgetByName from "./widget-by-name";
import { Tooltip } from "@courselit/components-library";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Plus } from "lucide-react";

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
    state,
}: {
    item: Record<string, any>;
    pageData: WidgetProps<WidgetDefaultSettings>["pageData"];
    editing: boolean;
    onEditClick?: (widgetId: string) => void;
    allowsDownwardMovement?: boolean;
    allowsUpwardMovement?: boolean;
    allowsWidgetAddition?: boolean;
    index: number;
    onAddWidgetBelow?: (index: number) => void;
    onMoveWidgetUp?: (index: number) => void;
    onMoveWidgetDown?: (index: number) => void;
    state: State;
}) => {
    if (editing) {
        return (
            <div
                onClick={() => onEditClick && onEditClick(item.widgetId)}
                className="relative cursor-pointer group"
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
            state={state}
            editing={false}
        />
    );
};

export default EditableWidget;
