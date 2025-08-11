import React, { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@courselit/components-library";

interface MarqueeProps {
    children: ReactNode;
    direction?: "left" | "right";
    speed?: number;
    pauseOnHover?: boolean;
    className?: string;
    itemClassName?: string;
}

export default function Marquee({
    children,
    direction = "right",
    speed = 40,
    pauseOnHover = false,
    className,
    itemClassName,
}: MarqueeProps) {
    const [containerWidth, setContainerWidth] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);
    const [duration, setDuration] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && contentRef.current) {
            const calculateWidth = () => {
                const containerWidth = containerRef.current?.offsetWidth || 0;
                const contentWidth = contentRef.current?.offsetWidth || 0;

                setContainerWidth(containerWidth);
                setContentWidth(contentWidth);

                // Calculate duration based on content width and speed
                // The larger the content, the longer the duration needs to be
                const calculatedDuration = contentWidth / speed;
                setDuration(calculatedDuration);
            };

            calculateWidth();

            // Recalculate on window resize
            window.addEventListener("resize", calculateWidth);
            return () => window.removeEventListener("resize", calculateWidth);
        }
    }, [speed, children]);

    // We need to duplicate the content to create a seamless loop
    // If the content is shorter than the container, we need to duplicate it multiple times
    const duplicatesNeeded = Math.max(
        2,
        Math.ceil((containerWidth * 2) / contentWidth),
    );

    return (
        <div
            ref={containerRef}
            className={cn("relative overflow-hidden w-full", className)}
            aria-hidden="true" // Hide from screen readers as this is decorative
        >
            <div
                className={cn(
                    "inline-flex",
                    pauseOnHover && "hover:[animation-play-state:paused]",
                )}
                style={{
                    animationDuration: `${duration}s`,
                    animationName: "marquee",
                    animationTimingFunction: "linear",
                    animationIterationCount: "infinite",
                    animationDirection:
                        direction === "left" ? "reverse" : "normal",
                }}
            >
                <div ref={contentRef} className={cn("flex", itemClassName)}>
                    {children}
                </div>

                {/* Duplicate the content to create a seamless loop */}
                {Array.from({ length: duplicatesNeeded }).map((_, index) => (
                    <div key={index} className={cn("flex", itemClassName)}>
                        {children}
                    </div>
                ))}
            </div>

            <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-${contentWidth}px);
          }
        }
      `}</style>
        </div>
    );
}
