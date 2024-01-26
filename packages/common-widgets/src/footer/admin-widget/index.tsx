import React, { useEffect, useState } from "react";
import type Settings from "../settings";
import {
    AdminWidgetPanel,
    Button,
    ColorSelector,
    IconButton,
    PageBuilderSlider,
    Select,
} from "@courselit/components-library";
import { Link, Section } from "../settings";
import { ContentPaddingSelector } from "@courselit/components-library";
import { Accordion } from "@courselit/components-library";
import { AccordionItem } from "@courselit/components-library";
import { AccordionTrigger } from "@courselit/components-library";
import { AccordionContent } from "@courselit/components-library";
import { Form } from "@courselit/components-library";
import { FormField } from "@courselit/components-library";
import { Check } from "@courselit/icons";
import LinkEditor from "./link-editor";

export interface AdminWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
}

export default function AdminWidget({ settings, onChange }: AdminWidgetProps) {
    const defaultSections: Section[] = [
        {
            name: "Legal",
            links: [
                { label: "Terms of use", href: "/p/terms" },
                { label: "Privacy policy", href: "/p/privacy" },
            ],
        },
    ];
    const [sections, setSections] = useState<Section[]>(
        settings.sections || defaultSections,
    );
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor,
    );
    const [horizontalPadding, setHorizontalPadding] = useState<number>(
        settings.horizontalPadding || 100,
    );
    const [verticalPadding, setVerticalPadding] = useState<number>(
        settings.verticalPadding || 16,
    );
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [sectionName, setSectionName] = useState("");
    const [sectionBeingEdited, setSectionBeingEdited] = useState(-1);
    const [titleFontSize, setTitleFontSize] = useState(
        settings.titleFontSize || 2,
    );
    const [sectionHeaderFontSize, setSectionHeaderFontSize] = useState(
        settings.sectionHeaderFontSize || "font-semibold",
    );

    useEffect(() => {
        onChange({
            sections,
            backgroundColor,
            foregroundColor,
            horizontalPadding,
            verticalPadding,
            titleFontSize,
            sectionHeaderFontSize,
        });
    }, [
        sections,
        backgroundColor,
        foregroundColor,
        horizontalPadding,
        verticalPadding,
        titleFontSize,
        sectionHeaderFontSize,
    ]);

    const addNewSection = () => {
        if (sections.length >= 5) return;

        const section: Section = {
            name: `Section ${sections.length + 1}`,
            links: [
                {
                    label: "Link",
                    href: "https://courselit.app",
                },
            ],
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
        };
        const newSections = [...sections];
        newSections[sectionIndex].links.push(link);
        setSections(newSections);
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
                                    {section.links &&
                                        section.links.map((link, index) => (
                                            <div
                                                key={`${link.label}-${link.href}-${index}`}
                                            >
                                                <LinkEditor
                                                    link={link}
                                                    index={index}
                                                    sectionIndex={sectionIndex}
                                                    key={`${link.label}-${link.href}-${index}`}
                                                    onChange={onLinkChanged}
                                                    onDelete={onLinkDeleted}
                                                />
                                            </div>
                                        ))}
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
                    Add new link
                </Button>
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
                <ContentPaddingSelector
                    value={horizontalPadding}
                    min={50}
                    onChange={setHorizontalPadding}
                />
                <ContentPaddingSelector
                    variant="vertical"
                    value={verticalPadding}
                    onChange={setVerticalPadding}
                />
                <PageBuilderSlider
                    title="Title font size"
                    min={2}
                    max={4}
                    value={titleFontSize}
                    onChange={setTitleFontSize}
                />
                <Select
                    title="Section headers font weight"
                    value={sectionHeaderFontSize}
                    options={[
                        { label: "Normal", value: "font-normal" },
                        { label: "Bold", value: "font-medium" },
                        { label: "Bolder", value: "font-semibold" },
                    ]}
                    onChange={(
                        value: "font-semibold" | "font-normal" | "font-medium",
                    ) => setSectionHeaderFontSize(value)}
                />
            </AdminWidgetPanel>
        </div>
    );
}
