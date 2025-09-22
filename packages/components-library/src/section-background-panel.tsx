import * as React from "react";
import {
    SectionBackground,
    SectionBackgroundOverlay,
    BlendMode,
    BackgroundRepeat,
} from "@courselit/page-models";
import ColorSelector from "./color-selector";
import PageBuilderSlider from "./page-builder-slider";
import CustomSelect from "./select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "./components/ui/accordion";
import MediaSelector from "./media-selector";
import { Address, Media, Profile } from "@courselit/common-models";

interface SectionBackgroundPanelProps {
    value: SectionBackground;
    onChange: (value: SectionBackground) => void;
    className?: string;
    profile: Profile;
    address: Address;
}

const BLEND_MODES: { label: string; value: BlendMode }[] = [
    { label: "Normal", value: "normal" },
    { label: "Multiply", value: "multiply" },
    { label: "Screen", value: "screen" },
    { label: "Overlay", value: "overlay" },
    { label: "Darken", value: "darken" },
    { label: "Lighten", value: "lighten" },
    { label: "Color Dodge", value: "color-dodge" },
    { label: "Color Burn", value: "color-burn" },
    { label: "Hard Light", value: "hard-light" },
    { label: "Soft Light", value: "soft-light" },
    { label: "Difference", value: "difference" },
    { label: "Exclusion", value: "exclusion" },
    { label: "Hue", value: "hue" },
    { label: "Saturation", value: "saturation" },
    { label: "Color", value: "color" },
    { label: "Luminosity", value: "luminosity" },
];

const BACKGROUND_REPEAT_OPTIONS: { label: string; value: BackgroundRepeat }[] =
    [
        { label: "No Repeat", value: "no-repeat" },
        { label: "Repeat", value: "repeat" },
        { label: "Repeat X", value: "repeat-x" },
        { label: "Repeat Y", value: "repeat-y" },
        { label: "Space", value: "space" },
        { label: "Round", value: "round" },
    ];

export function SectionBackgroundPanel({
    value = {
        type: "color",
        backgroundColor: "transparent",
        backgroundColorDark: undefined,
    },
    onChange,
    className,
    profile,
    address,
}: SectionBackgroundPanelProps) {
    const handleTypeChange = (type: SectionBackground["type"]) => {
        // Simply change the type while preserving all existing properties
        onChange({
            ...value,
            type,
        });
    };

    const handleColorBackgroundChange = (
        updates: Partial<SectionBackground>,
    ) => {
        onChange({ ...value, ...updates });
    };

    const handleImageBackgroundChange = (
        updates: Partial<SectionBackground>,
    ) => {
        onChange({ ...value, ...updates });
    };

    const handleGradientBackgroundChange = (
        updates: Partial<SectionBackground>,
    ) => {
        onChange({ ...value, ...updates });
    };

    const handleOverlayChange = (
        overlayUpdates: Partial<SectionBackgroundOverlay>,
    ) => {
        onChange({
            ...value,
            overlay: { ...value.overlay, ...overlayUpdates },
        });
    };

    return (
        <div className={className}>
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="background" className="border-none">
                    <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                        Background
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-2">
                        <div className="space-y-2">
                            <Tabs
                                value={value.type}
                                onValueChange={handleTypeChange}
                                className="w-full"
                            >
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="color">
                                        Color
                                    </TabsTrigger>
                                    <TabsTrigger value="image">
                                        Image
                                    </TabsTrigger>
                                    <TabsTrigger value="gradient">
                                        Gradient
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent
                                    value="color"
                                    className="space-y-4 mt-6"
                                >
                                    <ColorSelector
                                        title="Background Color"
                                        value={value.backgroundColor || ""}
                                        onChange={(color) =>
                                            handleColorBackgroundChange({
                                                backgroundColor:
                                                    color || "#ffffff",
                                            })
                                        }
                                        tooltip="Choose the background color for this section"
                                    />
                                    <ColorSelector
                                        title="Dark Mode Color"
                                        value={value.backgroundColorDark || ""}
                                        onChange={(color) =>
                                            handleColorBackgroundChange({
                                                backgroundColorDark: color,
                                            })
                                        }
                                        tooltip="Optional background color for dark mode"
                                        allowReset={true}
                                    />
                                </TabsContent>

                                <TabsContent
                                    value="image"
                                    className="space-y-4 mt-6"
                                >
                                    <MediaSelector
                                        title=""
                                        src={
                                            value.media &&
                                            (value.media.thumbnail as string)
                                        }
                                        srcTitle={
                                            value.media &&
                                            (value.media
                                                .originalFileName as string)
                                        }
                                        profile={profile}
                                        address={address}
                                        onSelection={(media: Media) => {
                                            if (media) {
                                                handleImageBackgroundChange({
                                                    media: media as unknown as Record<
                                                        string,
                                                        unknown
                                                    >,
                                                });
                                            }
                                        }}
                                        onRemove={() => {
                                            handleImageBackgroundChange({
                                                media: {} as unknown as Record<
                                                    string,
                                                    unknown
                                                >,
                                            });
                                        }}
                                        strings={{}}
                                        access="public"
                                        mediaId={
                                            value.media &&
                                            (value.media.mediaId as string)
                                        }
                                        type="page"
                                    />

                                    {/* Blur Effect */}
                                    <PageBuilderSlider
                                        title="Blur"
                                        min={0}
                                        max={20}
                                        value={value.blur || 0}
                                        onChange={(blur) =>
                                            handleImageBackgroundChange({
                                                blur: blur || 0,
                                            })
                                        }
                                        tooltip="Blur effect to the background image"
                                        unit=""
                                    />

                                    {/* Overlay Settings */}
                                    <Accordion
                                        type="single"
                                        collapsible
                                        className="w-full"
                                    >
                                        <AccordionItem
                                            value="overlay"
                                            className="border-none"
                                        >
                                            <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                                                Overlay Settings
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-4 pt-2">
                                                <ColorSelector
                                                    title="Overlay Color"
                                                    value={
                                                        value.overlay?.color ||
                                                        ""
                                                    }
                                                    onChange={(color) =>
                                                        handleOverlayChange({
                                                            color,
                                                        })
                                                    }
                                                    tooltip="Color of the overlay on top of the background image"
                                                />
                                                <ColorSelector
                                                    title="Dark Mode Overlay Color"
                                                    value={
                                                        value.overlay
                                                            ?.colorDark || ""
                                                    }
                                                    onChange={(color) =>
                                                        handleOverlayChange({
                                                            colorDark: color,
                                                        })
                                                    }
                                                    tooltip="Optional overlay color for dark mode"
                                                    allowReset={true}
                                                />
                                                <PageBuilderSlider
                                                    title="Opacity"
                                                    min={0}
                                                    max={10}
                                                    value={
                                                        value.overlay?.opacity
                                                    }
                                                    onChange={(opacity) =>
                                                        handleOverlayChange({
                                                            opacity,
                                                        })
                                                    }
                                                    tooltip="Opacity of the overlay"
                                                    unit=""
                                                />
                                                <CustomSelect
                                                    title="Blend Mode"
                                                    value={
                                                        value.overlay
                                                            ?.blendMode ||
                                                        "normal"
                                                    }
                                                    onChange={(mode) =>
                                                        handleOverlayChange({
                                                            blendMode:
                                                                mode as BlendMode,
                                                        })
                                                    }
                                                    options={BLEND_MODES}
                                                />
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>

                                    {/* Advanced Settings */}
                                    <Accordion
                                        type="single"
                                        collapsible
                                        className="w-full"
                                    >
                                        <AccordionItem
                                            value="advanced"
                                            className="border-none"
                                        >
                                            <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                                                Advanced
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-4 pt-2">
                                                {/* Image Properties */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="image-background-size">
                                                        Background Size
                                                    </Label>
                                                    <Input
                                                        id="image-background-size"
                                                        value={
                                                            value.backgroundSize
                                                        }
                                                        onChange={(e) =>
                                                            handleImageBackgroundChange(
                                                                {
                                                                    backgroundSize:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                        placeholder="cover, contain, 100%, etc."
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="image-background-position">
                                                        Background Position
                                                    </Label>
                                                    <Input
                                                        id="image-background-position"
                                                        value={
                                                            value.backgroundPosition
                                                        }
                                                        onChange={(e) =>
                                                            handleImageBackgroundChange(
                                                                {
                                                                    backgroundPosition:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                        placeholder="center, top left, 50% 50%, etc."
                                                    />
                                                </div>

                                                <CustomSelect
                                                    title="Background Repeat"
                                                    value={
                                                        value.backgroundRepeat ||
                                                        "no-repeat"
                                                    }
                                                    onChange={(repeat) =>
                                                        handleImageBackgroundChange(
                                                            {
                                                                backgroundRepeat:
                                                                    repeat as BackgroundRepeat,
                                                            },
                                                        )
                                                    }
                                                    options={
                                                        BACKGROUND_REPEAT_OPTIONS
                                                    }
                                                />

                                                {/* Mask Image */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="mask-image">
                                                        Mask Image (Optional)
                                                    </Label>
                                                    <Input
                                                        id="mask-image"
                                                        value={
                                                            value.maskImage ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            handleImageBackgroundChange(
                                                                {
                                                                    maskImage:
                                                                        e.target
                                                                            .value ||
                                                                        undefined,
                                                                },
                                                            )
                                                        }
                                                        placeholder="https://example.com/mask.svg"
                                                    />
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </TabsContent>

                                <TabsContent
                                    value="gradient"
                                    className="space-y-4 mt-6"
                                >
                                    {/* Gradient CSS */}
                                    <div className="space-y-2">
                                        <Label htmlFor="gradient-css">
                                            Gradient CSS
                                        </Label>
                                        <Input
                                            id="gradient-css"
                                            value={value.backgroundImage || ""}
                                            onChange={(e) =>
                                                handleGradientBackgroundChange({
                                                    backgroundImage:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="linear-gradient(45deg, #ff0000, #0000ff)"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Enter CSS gradient syntax (e.g.,
                                            linear-gradient, radial-gradient)
                                        </p>
                                    </div>

                                    {/* Dark Mode Gradient */}
                                    <div className="space-y-2">
                                        <Label htmlFor="gradient-css-dark">
                                            Dark Mode Gradient (Optional)
                                        </Label>
                                        <Input
                                            id="gradient-css-dark"
                                            value={
                                                value.backgroundImageDark || ""
                                            }
                                            onChange={(e) =>
                                                handleGradientBackgroundChange({
                                                    backgroundImageDark:
                                                        e.target.value ||
                                                        undefined,
                                                })
                                            }
                                            placeholder="linear-gradient(45deg, #333333, #666666)"
                                        />
                                    </div>

                                    {/* Advanced Settings */}
                                    <Accordion
                                        type="single"
                                        collapsible
                                        className="w-full"
                                    >
                                        <AccordionItem
                                            value="gradient-advanced"
                                            className="border-none"
                                        >
                                            <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                                                Advanced
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-4 pt-2">
                                                {/* Gradient Properties */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="gradient-background-size">
                                                        Background Size
                                                    </Label>
                                                    <Input
                                                        id="gradient-background-size"
                                                        value={
                                                            (value as any)
                                                                .gradientBackgroundSize
                                                        }
                                                        onChange={(e) =>
                                                            handleGradientBackgroundChange(
                                                                {
                                                                    gradientBackgroundSize:
                                                                        e.target
                                                                            .value,
                                                                } as any,
                                                            )
                                                        }
                                                        placeholder="cover, contain, 100%, etc."
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="gradient-background-position">
                                                        Background Position
                                                    </Label>
                                                    <Input
                                                        id="gradient-background-position"
                                                        value={
                                                            (value as any)
                                                                .gradientBackgroundPosition
                                                        }
                                                        onChange={(e) =>
                                                            handleGradientBackgroundChange(
                                                                {
                                                                    gradientBackgroundPosition:
                                                                        e.target
                                                                            .value,
                                                                } as any,
                                                            )
                                                        }
                                                        placeholder="center, top left, 50% 50%, etc."
                                                    />
                                                </div>

                                                <CustomSelect
                                                    title="Background Repeat"
                                                    value={
                                                        (value as any)
                                                            .gradientBackgroundRepeat ||
                                                        "no-repeat"
                                                    }
                                                    onChange={(repeat) =>
                                                        handleGradientBackgroundChange(
                                                            {
                                                                gradientBackgroundRepeat:
                                                                    repeat as BackgroundRepeat,
                                                            } as any,
                                                        )
                                                    }
                                                    options={
                                                        BACKGROUND_REPEAT_OPTIONS
                                                    }
                                                />

                                                {/* Mask Image */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="gradient-mask-image">
                                                        Mask Image CSS
                                                        (Optional)
                                                    </Label>
                                                    <Input
                                                        id="gradient-mask-image"
                                                        value={
                                                            (value as any)
                                                                .gradientMaskImage ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            handleGradientBackgroundChange(
                                                                {
                                                                    gradientMaskImage:
                                                                        e.target
                                                                            .value ||
                                                                        undefined,
                                                                } as any,
                                                            )
                                                        }
                                                        placeholder="clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);"
                                                    />
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
