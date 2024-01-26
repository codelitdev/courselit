import { Help } from "@courselit/icons";
import Tooltip from "./tooltip";
import { Label } from "@radix-ui/react-form";

export default function PageBuilderPropertyHeader({
    label,
    tooltip,
    variant = "normal",
}: {
    label: string;
    tooltip?: string;
    variant?: "form" | "normal";
}) {
    return (
        <div className="flex grow items-center gap-1">
            {variant === "form" && (
                <Label className="mb-1 font-medium">{label}</Label>
            )}
            {variant === "normal" && (
                <h2 className="mb-1 font-medium">{label}</h2>
            )}
            {tooltip && (
                <Tooltip title={tooltip}>
                    <Help />
                </Tooltip>
            )}
        </div>
    );
}
