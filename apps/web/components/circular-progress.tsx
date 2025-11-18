import { cn } from "@/lib/shadcn-utils";
import type React from "react";

export interface ProgressCircleProps extends React.ComponentProps<"svg"> {
    value: number;
    className?: string;
    /**
     * Matches lucide/shadcn pattern: viewBox stays 0 0 24 24 but rendered size can be
     * controlled via `className` (e.g. "h-6 w-6") or overridden via this prop.
     */
    size?: number;
    strokeWidth?: number;
}

// https://github.com/shadcn-ui/ui/issues/697
// https://github.com/shadcn-ui/ui/issues/697#issuecomment-2621653578 CircularProgress

function clamp(input: number, a: number, b: number): number {
    return Math.max(Math.min(input, Math.max(a, b)), Math.min(a, b));
}

// fix to percentage values
const total = 100;

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress
 * @see https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/progressbar_role
 */
export const CircularProgress = ({
    value,
    className,
    size = 24,
    strokeWidth = 2,
    ...restSvgProps
}: ProgressCircleProps): any => {
    const normalizedValue = clamp(value, 0, total);

    // geometry is based on the viewBox size (default 24) to match lucide icons.
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (normalizedValue / total) * circumference;
    const halfSize = size / 2;

    const commonParams = {
        cx: halfSize,
        cy: halfSize,
        r: radius,
        fill: "none",
        strokeWidth,
    };

    return (
        // biome-ignore lint/a11y/useFocusableInteractive: false positive (progress + progressbar are not focusable interactives)
        // biome-ignore lint/nursery/useAriaPropsSupportedByRole: biome rule at odds with mdn docs (presumed nursary bug with rule)
        <svg
            // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: false positive (progressbar not an interactive role)
            role="progressbar"
            viewBox={`0 0 ${size} ${size}`}
            className={cn("h-6 w-6 text-primary", className)}
            aria-valuenow={normalizedValue}
            aria-valuemin={0}
            aria-valuemax={total}
            {...restSvgProps}
        >
            <circle
                {...commonParams}
                stroke="currentColor"
                className="text-muted-foreground/50"
            />
            <circle
                {...commonParams}
                stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                strokeLinecap="round"
                transform={`rotate(-90 ${halfSize} ${halfSize})`}
                className="stroke-current"
            />
        </svg>
    );
};
