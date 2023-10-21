import { IconButton } from "@courselit/components-library";
import { Cross } from "@courselit/icons";
import Filter from "../../../ui-models/filter";

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
    const { name, condition, value } = filter;
    return (
        <div className="text-sm flex flex-wrap py-[2px] px-[4px] items-center rounded bg-slate-200">
            <div>
                {name}:{condition}:{value}
            </div>
            <IconButton variant="transparent" onClick={() => onRemove(index)}>
                <Cross />
            </IconButton>
        </div>
    );
}
