import { Tooltip } from "@courselit/components-library";
import { capitalize } from "@courselit/utils";
import { USER_FILTER_CHIP_TOOLTIP } from "@ui-config/strings";
import { useMemo } from "react";
import permissionToCaptionMap from "../permissions-to-caption-map";
import { UserFilter as Filter } from "@courselit/common-models";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { X } from "lucide-react";

interface FilterChipProps {
    filter: Filter;
    index: number;
    onRemove: (index: number) => void;
    disabled?: boolean;
}

export default function FilterChip({
    filter,
    index,
    onRemove,
    disabled = false,
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
        <Badge
            variant="secondary"
            className="flex items-center gap-1 py-1.5 px-3"
        >
            <div>
                <span className="font-medium">{capitalize(name)}</span>:{" "}
                <span className="italic">{condition}</span>{" "}
                {displayedValue && (
                    <span className="font-medium"> {displayedValue}</span>
                )}
            </div>
            {!disabled && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                    onClick={() => onRemove(index)}
                >
                    <Tooltip title={USER_FILTER_CHIP_TOOLTIP}>
                        <X className="w-4 h-4" />
                    </Tooltip>
                </Button>
            )}
        </Badge>
    );
}
