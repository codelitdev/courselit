import React, { useEffect, useState } from "react";
import type Settings from "../settings";
import {
    AdminWidgetPanel,
    Button,
    ColorSelector,
    IconButton,
    PageBuilderSlider,
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
    Form,
    FormField,
    MaxWidthSelector,
    VerticalPaddingSelector,
} from "@courselit/components-library";
import { Link, Section, Socials } from "../settings";
import { Check } from "@courselit/icons";
import LinkEditor from "./link-editor";
import {
    titleFontSize as defaultTitleFontSize,
    // subtitleFontSize as defaultSubtitleFontSize,
    socials as defaultSocials,
    socialIconsSize as defaultSocialIconsSize,
} from "../defaults";
import { DragAndDrop } from "@courselit/components-library";
import { generateUniqueId } from "@courselit/utils";
import { Theme, ThemeStyle } from "@courselit/page-models";

export interface AdminWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
    theme: Theme;
}

export default function AdminWidget({
    settings,
    onChange,
    theme,
}: AdminWidgetProps): JSX.Element {
    const [sections, setSections] = useState<Section[]>(
        settings.sections || [
            {
                name: "Legal",
                links: [
                    {
                        label: "Terms of use",
                        href: "/p/terms",
                        id: generateUniqueId(),
                    },
                    {
                        label: "Privacy policy",
                        href: "/p/privacy",
                        id: generateUniqueId(),
                    },
                ],
                id: generateUniqueId(),
            },
        ],
    );
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor,
    );
    const [maxWidth, setMaxWidth] = useState<
        ThemeStyle["structure"]["page"]["width"]
    >(settings.maxWidth);
    const [verticalPadding, setVerticalPadding] = useState<
        ThemeStyle["structure"]["section"]["verticalPadding"]
    >(settings.verticalPadding);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [sectionName, setSectionName] = useState("");
    const [sectionBeingEdited, setSectionBeingEdited] = useState(-1);
    const [titleFontSize, setTitleFontSize] = useState(
        settings.titleFontSize || defaultTitleFontSize,
    );
    const [socials, setSocials] = useState<Socials>(
        settings.socials || defaultSocials,
    );
    const [socialIconsSize, setSocialIconsSize] = useState(
        settings.socialIconsSize || defaultSocialIconsSize,
    );
    // const [subtitleFontSize, setSubtitleFontSize] = useState(
    //     settings.subtitleFontSize || defaultSubtitleFontSize,
    // );

    useEffect(() => {
        onChange({
            sections,
            backgroundColor,
            foregroundColor,
            maxWidth,
            verticalPadding,
            titleFontSize,
            socials,
            socialIconsSize,
            // subtitleFontSize,
        });
    }, [
        sections,
        backgroundColor,
        foregroundColor,
        maxWidth,
        verticalPadding,
        titleFontSize,
        // subtitleFontSize,
        socials,
        socialIconsSize,
    ]);

    const addNewSection = () => {
        if (sections.length >= 5) return;

        const section: Section = {
            name: `Section ${sections.length + 1}`,
            links: [
                {
                    label: "Link",
                    href: "https://courselit.app",
                    id: generateUniqueId(),
                },
            ],
            id: generateUniqueId(),
        };
        setSections([...sections, section]);
    };

    const renameSection = (sectionIndex: number) => (e: any) => {
        e.preventDefault();
        const newSections = [...sections];
        newSections[sectionIndex].name = sectionName;
        setSections(newSections);
        setSectionName("");
        setSectionBeingEdited(-1);
    };

    const onLinkChanged = (
        sectionIndex: number,
        linkIndex: number,
        link: Link,
    ) => {
        const newSections = [...sections];
        newSections[sectionIndex].links[linkIndex] = link;
        setSections(newSections);
    };

    const onLinkDeleted = (sectionIndex: number, linkIndex: number) => {
        const newSections = [...sections];
        newSections[sectionIndex].links.splice(linkIndex, 1);
        setSections(newSections);
    };

    const addNewLink = (sectionIndex: number) => {
        const link: Link = {
            label: "Link",
            href: "https://courselit.app",
            id: generateUniqueId(),
        };
        const newSections = [...sections];
        newSections[sectionIndex].links.push(link);
        setSections(newSections);
    };

    const setSocial = (key: keyof Socials, value: string) => {
        const newSocials = { ...socials };
        newSocials[key] = value;
        setSocials(newSocials);
    };

    return (
        <div className="flex flex-col gap-4 mb-4">
            <AdminWidgetPanel title="Sections">
                {sections && (
                    <Accordion type="single" collapsible className="w-full">
                        {sections.map((section, sectionIndex) => (
                            <AccordionItem
                                value={`${section.name}-${sectionIndex}`}
                                key={
                                    section.name ||
                                    `${section.name}-${sectionIndex}`
                                }
                            >
                                <AccordionTrigger>
                                    {section.name || "[empty]"}
                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col gap-4">
                                    <Form
                                        className="flex gap-2 items-end"
                                        onSubmit={renameSection(sectionIndex)}
                                    >
                                        <FormField
                                            label="Section header"
                                            value={
                                                sectionBeingEdited ===
                                                sectionIndex
                                                    ? sectionName
                                                    : section.name
                                            }
                                            onChange={(e) => {
                                                setSectionBeingEdited(
                                                    sectionIndex,
                                                );
                                                setSectionName(e.target.value);
                                            }}
                                            className="w-full px-[4px]"
                                        />
                                        <IconButton>
                                            <Check />
                                        </IconButton>
                                    </Form>
                                    <h3 className="mb-1 font-medium">Links</h3>
                                    <DragAndDrop
                                        items={section.links.map(
                                            (link: Link, index: number) => ({
                                                link,
                                                index,
                                                sectionIndex,
                                                id:
                                                    link.id ||
                                                    generateUniqueId(),
                                                onChange: onLinkChanged,
                                                onDelete: onLinkDeleted,
                                            }),
                                        )}
                                        Renderer={LinkEditor}
                                        key={JSON.stringify(section.links)}
                                        onChange={(items: any) => {
                                            const newLinks = [
                                                ...items.map(
                                                    (item) => item.link,
                                                ),
                                            ];
                                            if (
                                                JSON.stringify(newLinks) !==
                                                JSON.stringify(section.links)
                                            ) {
                                                const newSections = [
                                                    ...sections,
                                                ];
                                                newSections[
                                                    sectionIndex
                                                ].links = newLinks;
                                                setSections(newSections);
                                            }
                                        }}
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            onClick={() =>
                                                addNewLink(sectionIndex)
                                            }
                                            fullWidth
                                        >
                                            Add new link
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => {
                                                if (confirmDelete) {
                                                    const newSections = [
                                                        ...sections,
                                                    ];
                                                    newSections.splice(
                                                        sectionIndex,
                                                        1,
                                                    );
                                                    setSections(newSections);
                                                    setConfirmDelete(false);
                                                } else {
                                                    setConfirmDelete(true);
                                                }
                                            }}
                                        >
                                            {confirmDelete
                                                ? "Sure?"
                                                : "Delete section"}
                                        </Button>
                                        {confirmDelete && (
                                            <Button
                                                onClick={() =>
                                                    setConfirmDelete(false)
                                                }
                                                variant="secondary"
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
                <Button
                    onClick={addNewSection}
                    disabled={sections.length >= 5}
                    fullWidth
                >
                    Add new section
                </Button>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Social media">
                <Form className="flex flex-col gap-2">
                    <FormField
                        label="Facebook"
                        value={socials.facebook}
                        onChange={(e) => setSocial("facebook", e.target.value)}
                    />
                    <FormField
                        label="Twitter"
                        value={socials.twitter}
                        onChange={(e) => setSocial("twitter", e.target.value)}
                    />
                    <FormField
                        label="Instagram"
                        value={socials.instagram}
                        onChange={(e) => setSocial("instagram", e.target.value)}
                    />
                    <FormField
                        label="YouTube"
                        value={socials.youtube}
                        onChange={(e) => setSocial("youtube", e.target.value)}
                    />
                    <FormField
                        label="Linkedin"
                        value={socials.linkedin}
                        onChange={(e) => setSocial("linkedin", e.target.value)}
                    />
                    <FormField
                        label="Discord"
                        value={socials.discord}
                        onChange={(e) => setSocial("discord", e.target.value)}
                    />
                    <FormField
                        label="Github"
                        value={socials.github}
                        onChange={(e) => setSocial("github", e.target.value)}
                    />
                </Form>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design">
                <ColorSelector
                    title="Text color"
                    value={foregroundColor || "inherit"}
                    onChange={(value?: string) => setForegroundColor(value)}
                />
                <ColorSelector
                    title="Background color"
                    value={backgroundColor || "inherit"}
                    onChange={(value?: string) => setBackgroundColor(value)}
                />
                <PageBuilderSlider
                    title="Title font size"
                    min={2}
                    max={4}
                    value={titleFontSize}
                    onChange={setTitleFontSize}
                />
                {/* <PageBuilderSlider
                    title="Subtitle font size"
                    min={1}
                    max={4}
                    value={subtitleFontSize}
                    onChange={setSubtitleFontSize}
                /> */}
                <PageBuilderSlider
                    title="Social icons size"
                    min={16}
                    max={48}
                    value={socialIconsSize}
                    onChange={setSocialIconsSize}
                />
                <MaxWidthSelector
                    value={maxWidth || theme.theme.structure.page.width}
                    onChange={setMaxWidth}
                />
                <VerticalPaddingSelector
                    value={
                        verticalPadding ||
                        theme.theme.structure.section.verticalPadding
                    }
                    onChange={setVerticalPadding}
                />
            </AdminWidgetPanel>
        </div>
    );
}
