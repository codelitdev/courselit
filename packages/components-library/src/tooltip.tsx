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
    className?: string;
}

export default function CustomTooltip({
    title,
    children,
    side = "bottom",
    className,
}: TooltipProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span>{children}</span>
                </TooltipTrigger>
                <TooltipContent side={side}>
                    <p className={className}>{title}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
