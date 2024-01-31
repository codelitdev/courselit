import * as React from "react";
import { IconProps } from "@radix-ui/react-icons/dist/types";

export const FacebookIcon = React.forwardRef<SVGSVGElement, IconProps>(
    ({ color = "currentColor", ...props }, forwardedRef) => {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                {...props}
                ref={forwardedRef}
            >
                <path
                    d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
                    fill={color}
                    fillRule="evenodd"
                    clipRule="evenodd"
                />
            </svg>
        );
    },
);
