import { Button } from "@components/ui/button";
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@courselit/components-library";
import { CircleCheckIcon, CircleIcon } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

interface SetupAccordionItemProps {
    value: string;
    title: string;
    description: ReactNode;
    buttonText: string;
    buttonLink: string;
    isCompleted: boolean;
}

export function SetupAccordionItem({
    value,
    title,
    description,
    buttonText,
    buttonLink,
    isCompleted,
}: SetupAccordionItemProps) {
    return (
        <AccordionItem value={value}>
            <AccordionTrigger
                className={`${isCompleted ? "text-muted-foreground" : ""}`}
            >
                <div className="flex items-center gap-2">
                    {!isCompleted ? (
                        <CircleIcon className="w-4 h-4" />
                    ) : (
                        <CircleCheckIcon className="w-4 h-4" />
                    )}
                    <p className={`${isCompleted ? "line-through" : ""}`}>
                        {title}
                    </p>
                </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4">
                {description}
                <Link href={buttonLink}>
                    <Button size="sm">{buttonText}</Button>
                </Link>
            </AccordionContent>
        </AccordionItem>
    );
}
