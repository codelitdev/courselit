import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import { Border, ThemeStyle } from "@courselit/page-models";
import {
    paddingOptions,
    borderWidthOptions,
    borderStyleOptions,
    borderRadiusOptions,
    shadowOptions,
} from "./tailwind-to-human-readable";
import {
    Button,
    PageCard,
    PageCardContent,
    PageCardHeader,
    Input as PageInput,
    Link as PageLink,
} from "@courselit/page-primitives";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@courselit/components-library";
import DocumentationLink from "@/components/public/documentation-link";

interface InteractiveSelectorProps {
    type: "button" | "link" | "card" | "input";
    theme: ThemeStyle;
    onChange: (theme: ThemeStyle) => void;
    title?: string;
}

const interactiveDisplayNames: Record<string, string> = {
    button: "Button",
    link: "Link",
    card: "Card",
    input: "Input",
} as const;

function InteractiveSelector({
    type,
    theme,
    onChange,
    title,
}: InteractiveSelectorProps) {
    const value = theme.interactives[type];

    const renderDemo = () => {
        switch (type) {
            case "button":
                return (
                    <div className="space-y-2 flex flex-col">
                        <Label className="text-xs text-muted-foreground">
                            Preview
                        </Label>
                        <Button theme={theme}>Preview</Button>
                    </div>
                );
            case "link":
                return (
                    <div className="space-y-2 flex flex-col">
                        <Label className="text-xs text-muted-foreground">
                            Preview
                        </Label>
                        <PageLink theme={theme}>Demo Link</PageLink>
                    </div>
                );
            case "card":
                return (
                    <div className="space-y-2 flex flex-col">
                        <Label className="text-xs text-muted-foreground">
                            Preview
                        </Label>
                        <PageCard theme={theme}>
                            <PageCardContent theme={theme}>
                                <PageCardHeader theme={theme}>
                                    Card Title
                                </PageCardHeader>
                                <div>Card content goes here</div>
                            </PageCardContent>
                        </PageCard>
                    </div>
                );
            case "input":
                return (
                    <div className="space-y-2 flex flex-col">
                        <Label className="text-xs text-muted-foreground">
                            Preview
                        </Label>
                        <PageInput
                            theme={theme}
                            type="text"
                            placeholder="Demo Input"
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    const renderConfig = () => {
        const renderPaddingConfig = (
            allowedPaddingX?: string[],
            allowedPaddingY?: string[],
        ) => {
            const filteredPaddingX = allowedPaddingX
                ? paddingOptions.x.filter((option) =>
                      allowedPaddingX.includes(option.value),
                  )
                : paddingOptions.x;

            const filteredPaddingY = allowedPaddingY
                ? paddingOptions.y.filter((option) =>
                      allowedPaddingY.includes(option.value),
                  )
                : paddingOptions.y;

            return (
                <AccordionItem
                    value="padding"
                    className="border rounded-md mb-4"
                >
                    <AccordionTrigger className="px-2 py-3 text-xs font-semibold rounded-t-md hover:bg-muted transition-colors hover:no-underline data-[state=open]:border-b">
                        Padding
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Padding X</Label>
                                <Select
                                    value={value?.padding?.x || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...theme,
                                            interactives: {
                                                ...theme.interactives,
                                                [type]: {
                                                    ...value,
                                                    padding: {
                                                        ...value?.padding,
                                                        x: newValue,
                                                    },
                                                },
                                            },
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select padding" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredPaddingX.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Padding Y</Label>
                                <Select
                                    value={value?.padding?.y || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...theme,
                                            interactives: {
                                                ...theme.interactives,
                                                [type]: {
                                                    ...value,
                                                    padding: {
                                                        ...value?.padding,
                                                        y: newValue,
                                                    },
                                                },
                                            },
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select padding" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredPaddingY.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            );
        };

        const renderBorderConfig = () => (
            <AccordionItem value="border" className="border rounded-md mb-4">
                <AccordionTrigger className="px-2 py-3 text-xs font-semibold rounded-t-md hover:bg-muted transition-colors hover:no-underline data-[state=open]:border-b">
                    Border
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-4 pt-2">
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Border Radius</Label>
                                <Select
                                    value={value?.border?.radius || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...theme,
                                            interactives: {
                                                ...theme.interactives,
                                                [type]: {
                                                    ...value,
                                                    border: {
                                                        ...value?.border,
                                                        radius: newValue as Border["radius"],
                                                    },
                                                },
                                            },
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select radius" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {borderRadiusOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Border Style</Label>
                                <Select
                                    value={value?.border?.style || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...theme,
                                            interactives: {
                                                ...theme.interactives,
                                                [type]: {
                                                    ...value,
                                                    border: {
                                                        ...value?.border,
                                                        style: newValue as Border["style"],
                                                    },
                                                },
                                            },
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {borderStyleOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Border Width</Label>
                                <Select
                                    value={value?.border?.width || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...theme,
                                            interactives: {
                                                ...theme.interactives,
                                                [type]: {
                                                    ...value,
                                                    border: {
                                                        ...value?.border,
                                                        width: newValue as Border["width"],
                                                    },
                                                },
                                            },
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select width" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {borderWidthOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        );

        const renderBoxShadowConfig = () => {
            if (type === "link") {
                return null;
            }

            const interactiveValue =
                (value as ThemeStyle["interactives"][
                    | "button"
                    | "card"
                    | "input"]) || {};

            return (
                <AccordionItem
                    value="shadow"
                    className="border rounded-md mb-4"
                >
                    <AccordionTrigger className="px-2 py-3 text-xs font-semibold rounded-t-md hover:bg-muted transition-colors hover:no-underline data-[state=open]:border-b">
                        Shadow
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-4 pt-2">
                        <div className="space-y-2">
                            <div className="space-y-2">
                                <Label>Shadow</Label>
                                <Select
                                    value={interactiveValue.shadow || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...theme,
                                            interactives: {
                                                ...theme.interactives,
                                                [type]: {
                                                    ...interactiveValue,
                                                    shadow: newValue,
                                                },
                                            },
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select shadow" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {shadowOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            );
        };

        const renderHoverInput = () => (
            <AccordionItem value="advanced" className="border rounded-md mb-4">
                <AccordionTrigger className="px-2 py-3 text-xs font-semibold rounded-t-md hover:bg-muted transition-colors hover:no-underline data-[state=open]:border-b">
                    Advanced
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-4 pt-2">
                    <div className="space-y-2">
                        <Label>Custom classes</Label>
                        <Input
                            value={value?.custom || ""}
                            onChange={(e) => {
                                onChange({
                                    ...theme,
                                    interactives: {
                                        ...theme.interactives,
                                        [type]: {
                                            ...value,
                                            custom: e.target.value,
                                        },
                                    },
                                });
                            }}
                            placeholder="Enter Tailwind classes"
                            className="w-full"
                        />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Info className="h-4 w-4" />
                            <span>
                                Use any supported Tailwind class here.{" "}
                                <DocumentationLink path="/en/theme/customization" />
                            </span>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        );

        switch (type) {
            case "button":
                return (
                    <div className="space-y-6">
                        <Accordion type="single" collapsible className="">
                            {renderPaddingConfig(
                                ["px-0", "px-4", "px-6", "px-8", "px-10"],
                                ["py-0", "py-4", "py-6", "py-8", "py-10"],
                            )}
                            {renderBorderConfig()}
                            {renderBoxShadowConfig()}
                            {renderHoverInput()}
                        </Accordion>
                    </div>
                );
            case "link":
                const linkValue = value as ThemeStyle["interactives"]["link"];
                return (
                    <div className="space-y-6">
                        <Accordion type="single" collapsible className="px-2">
                            {renderHoverInput()}
                            <AccordionItem
                                value="text-shadow"
                                className="border rounded-md mb-4"
                            >
                                <AccordionTrigger className="px-2 py-3 text-xs font-semibold rounded-t-md hover:bg-muted transition-colors hover:no-underline data-[state=open]:border-b">
                                    Text Shadow
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pb-4 pt-2">
                                    <div className="space-y-2">
                                        <Label>Text Shadow</Label>
                                        <Input
                                            value={linkValue?.textShadow || ""}
                                            placeholder="0px 0px 0px 0px rgba(0, 0, 0, 0.1)"
                                            onChange={(e) =>
                                                onChange({
                                                    ...theme,
                                                    interactives: {
                                                        ...theme.interactives,
                                                        [type]: {
                                                            ...linkValue,
                                                            textShadow:
                                                                e.target.value,
                                                        },
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                );
            case "card":
                return (
                    <div className="space-y-6">
                        <Accordion type="single" collapsible className="px-2">
                            {renderPaddingConfig([
                                "px-0",
                                "px-4",
                                "px-6",
                                "px-8",
                                "px-10",
                                "px-12",
                                "px-16",
                                "px-20",
                                "px-24",
                                "px-32",
                            ])}
                            {renderBorderConfig()}
                            {renderBoxShadowConfig()}
                            {renderHoverInput()}
                        </Accordion>
                    </div>
                );
            case "input":
                return (
                    <div className="space-y-6">
                        <Accordion type="single" collapsible className="px-2">
                            {renderPaddingConfig(
                                ["px-0", "px-4", "px-6", "px-8", "px-10"],
                                ["py-0", "py-4", "py-6", "py-8", "py-10"],
                            )}
                            {renderBorderConfig()}
                            {renderBoxShadowConfig()}
                            {renderHoverInput()}
                        </Accordion>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 p-2">
            {title && (
                <div>
                    <p className="text-sm font-semibold text-foreground">
                        {title}
                    </p>
                </div>
            )}
            <div className="border rounded-lg p-2 h-[100px] overflow-auto">
                {renderDemo()}
            </div>
            <div className="space-y-6">{renderConfig()}</div>
        </div>
    );
}

export { InteractiveSelector, interactiveDisplayNames };
