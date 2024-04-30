import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipProps {
    title: string;
    children: React.ReactNode;
    side?: "left" | "right" | "bottom" | "top";
}

export default function CustomTooltip({
    title,
    children,
    side = "bottom",
}: TooltipProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span>{children}</span>
                </TooltipTrigger>
                <TooltipContent side={side}>
                    <p>{title}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
