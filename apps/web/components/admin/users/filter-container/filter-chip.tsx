import { IconButton, Tooltip } from "@courselit/components-library";
import { Cross } from "@courselit/icons";
import { capitalize } from "@courselit/utils";
import { USER_FILTER_CHIP_TOOLTIP } from "@ui-config/strings";
import { useMemo } from "react";
import Filter from "@ui-models/filter";
import permissionToCaptionMap from "../permissions-to-caption-map";

interface FilterChipProps {
    filter: Filter;
    index: number;
    onRemove: (index: number) => void;
}

export default function FilterChip({
    filter,
    index,
    onRemove,
}: FilterChipProps) {
    const { name, condition, value, valueLabel } = filter;

    const displayedValue = useMemo(() => {
        let dispValue = valueLabel || value;
        if (name === "subscription") {
            dispValue = "";
        }
        if (name === "permission") {
            dispValue = permissionToCaptionMap[value];
        }
        return dispValue;
    }, [name, value, valueLabel]);

    return (
        <div className="text-xs flex flex-wrap py-[2px] px-[4px] items-center rounded bg-slate-200">
            <div>
                <span className="font-medium">{capitalize(name)}</span>:{" "}
                <span className="italic">{condition}</span>{" "}
                {displayedValue && (
                    <span className="font-medium"> {displayedValue}</span>
                )}
            </div>
            <IconButton variant="transparent" onClick={() => onRemove(index)}>
                <Tooltip title={USER_FILTER_CHIP_TOOLTIP}>
                    <Cross />
                </Tooltip>
            </IconButton>
        </div>
    );
}
