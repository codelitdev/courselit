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
    // opacityOptions,
    // cursorOptions,
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
    Dialog,
    DialogHeader,
    DialogContent,
    DialogTrigger,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@courselit/components-library";

interface InteractiveSelectorProps {
    type: "button" | "link" | "card" | "input";
    theme: ThemeStyle;
    onChange: (theme: ThemeStyle) => void;
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

        const renderBoxShadowConfig = () => (
            <AccordionItem value="shadow" className="border rounded-md mb-4">
                <AccordionTrigger className="px-2 py-3 text-xs font-semibold rounded-t-md hover:bg-muted transition-colors hover:no-underline data-[state=open]:border-b">
                    Shadow
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-4 pt-2">
                    <div className="space-y-2">
                        <div className="space-y-2">
                            <Label>Shadow</Label>
                            <Select
                                value={value?.shadow || ""}
                                onValueChange={(newValue) => {
                                    onChange({
                                        ...theme,
                                        interactives: {
                                            ...theme.interactives,
                                            [type]: {
                                                ...value,
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

        const renderHoverInput = () => (
            <AccordionItem value="advanced" className="border rounded-md mb-4">
                <AccordionTrigger className="px-2 py-3 text-xs font-semibold rounded-t-md hover:bg-muted transition-colors hover:no-underline data-[state=open]:border-b">
                    Advanced
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-4 pt-2">
                    <div className="space-y-2">
                        <Label>Hover Effect</Label>
                        <Input
                            value={value?.hover || ""}
                            onChange={(e) => {
                                onChange({
                                    ...theme,
                                    interactives: {
                                        ...theme.interactives,
                                        [type]: {
                                            ...value,
                                            hover: e.target.value,
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
                                <Dialog>
                                    <DialogTrigger>
                                        <span className="underline">
                                            Supported classes
                                        </span>
                                        .
                                    </DialogTrigger>
                                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>
                                                Supported Tailwind classes
                                            </DialogTitle>
                                            <DialogDescription>
                                                Here are the supported Tailwind
                                                classes you can use for hover
                                                effects:
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="mt-4 flex flex-col gap-8">
                                            <section>
                                                <h3 className="font-semibold text-base mb-2 border-b pb-1">
                                                    Transitions
                                                </h3>
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div>
                                                        <p className="font-medium mb-1">
                                                            Basic Transitions
                                                        </p>
                                                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                                            <li>transition</li>
                                                            <li>
                                                                transition-all
                                                            </li>
                                                            <li>
                                                                transition-colors
                                                            </li>
                                                            <li>
                                                                transition-opacity
                                                            </li>
                                                            <li>
                                                                transition-shadow
                                                            </li>
                                                            <li>
                                                                transition-transform
                                                            </li>
                                                            <li>
                                                                transition-none
                                                            </li>
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium mb-1">
                                                            Timing Functions
                                                        </p>
                                                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                                            <li>ease-in</li>
                                                            <li>ease-out</li>
                                                            <li>ease-in-out</li>
                                                            <li>ease-linear</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </section>
                                            <div className="border-t" />
                                            <section>
                                                <h3 className="font-semibold text-base mb-2 border-b pb-1">
                                                    Duration & Delay
                                                </h3>
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div>
                                                        <p className="font-medium mb-1">
                                                            Duration
                                                        </p>
                                                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                                            <li>
                                                                duration-100
                                                            </li>
                                                            <li>
                                                                duration-200
                                                            </li>
                                                            <li>
                                                                duration-300
                                                            </li>
                                                            <li>
                                                                duration-400
                                                            </li>
                                                            <li>
                                                                duration-500
                                                            </li>
                                                            <li>
                                                                duration-600
                                                            </li>
                                                            <li>
                                                                duration-700
                                                            </li>
                                                            <li>
                                                                duration-800
                                                            </li>
                                                            <li>
                                                                duration-900
                                                            </li>
                                                            <li>
                                                                duration-1000
                                                            </li>
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium mb-1">
                                                            Delay
                                                        </p>
                                                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                                            <li>delay-0</li>
                                                            <li>delay-75</li>
                                                            <li>delay-100</li>
                                                            <li>delay-150</li>
                                                            <li>delay-200</li>
                                                            <li>delay-300</li>
                                                            <li>delay-500</li>
                                                            <li>delay-700</li>
                                                            <li>delay-1000</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </section>
                                            <div className="border-t" />
                                            <section>
                                                <h3 className="font-semibold text-base mb-2 border-b pb-1">
                                                    Transform Effects
                                                </h3>
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div>
                                                        <p className="font-medium mb-1">
                                                            Scale
                                                        </p>
                                                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                                            <li>
                                                                hover:scale-0
                                                            </li>
                                                            <li>
                                                                hover:scale-50
                                                            </li>
                                                            <li>
                                                                hover:scale-75
                                                            </li>
                                                            <li>
                                                                hover:scale-90
                                                            </li>
                                                            <li>
                                                                hover:scale-95
                                                            </li>
                                                            <li>
                                                                hover:scale-100
                                                            </li>
                                                            <li>
                                                                hover:scale-105
                                                            </li>
                                                            <li>
                                                                hover:scale-110
                                                            </li>
                                                            <li>
                                                                hover:scale-125
                                                            </li>
                                                            <li>
                                                                hover:scale-150
                                                            </li>
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium mb-1">
                                                            Translate
                                                        </p>
                                                        <div className="flex flex-col gap-2">
                                                            <div>
                                                                <span className="font-medium text-xs">
                                                                    X axis:
                                                                </span>
                                                                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                                                    <li>
                                                                        hover:translate-x-1
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-x-2
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-x-3
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-x-4
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-x-5
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-x-6
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-x-7
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-x-8
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-x-9
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-x-10
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-x-1
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-x-2
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-x-3
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-x-4
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-x-5
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-x-6
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-x-7
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-x-8
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-x-9
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-x-10
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-xs">
                                                                    Y axis:
                                                                </span>
                                                                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                                                    <li>
                                                                        hover:translate-y-1
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-y-2
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-y-3
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-y-4
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-y-5
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-y-6
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-y-7
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-y-8
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-y-9
                                                                    </li>
                                                                    <li>
                                                                        hover:translate-y-10
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-y-1
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-y-2
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-y-3
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-y-4
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-y-5
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-y-6
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-y-7
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-y-8
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-y-9
                                                                    </li>
                                                                    <li>
                                                                        hover:-translate-y-10
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>
                                            <div className="border-t" />
                                            <section>
                                                <h3 className="font-semibold text-base mb-2 border-b pb-1">
                                                    Shadow Effects
                                                </h3>
                                                <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                                                    <li>hover:shadow-sm</li>
                                                    <li>hover:shadow-md</li>
                                                    <li>hover:shadow-lg</li>
                                                    <li>hover:shadow-xl</li>
                                                    <li>hover:shadow-2xl</li>
                                                    <li>hover:shadow-inner</li>
                                                    <li>hover:shadow-none</li>
                                                </ul>
                                            </section>
                                            <div className="border-t" />
                                            <section>
                                                <h3 className="font-semibold text-base mb-2 border-b pb-1">
                                                    Underline Effects
                                                </h3>
                                                <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                                                    <li>hover:underline</li>
                                                </ul>
                                            </section>
                                        </div>
                                    </DialogContent>
                                </Dialog>
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
                                            value={value?.textShadow || ""}
                                            placeholder="0px 0px 0px 0px rgba(0, 0, 0, 0.1)"
                                            onChange={(e) =>
                                                onChange({
                                                    ...theme,
                                                    interactives: {
                                                        ...theme.interactives,
                                                        [type]: {
                                                            ...value,
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
            <div className="border rounded-lg p-2 h-[100px] overflow-auto">
                {renderDemo()}
            </div>
            <div className="space-y-6">{renderConfig()}</div>
        </div>
    );
}

export { InteractiveSelector, interactiveDisplayNames };
