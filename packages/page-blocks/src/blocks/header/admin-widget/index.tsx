import React, { useEffect, useState } from "react";
import Settings, { Link } from "../settings";
import LinkEditor from "./link-editor";
import {
    AdminWidgetPanel,
    Select,
    Checkbox,
    Tooltip,
    PageBuilderSlider,
    MaxWidthSelector,
    FormField,
    Form,
    Button,
} from "@courselit/components-library";
import { Help } from "@courselit/icons";
import {
    spacingBetweenLinks as defaultSpacingBetweenLinks,
    linkFontWeight as defaultLinkFontWeight,
    linkAlignment as defaultLinkAlignment,
    showLoginControl as defaultShowLoginControl,
} from "../defaults";
import { DragAndDrop } from "@courselit/components-library";
import { generateUniqueId } from "@courselit/utils";
import { Theme, ThemeStyle } from "@courselit/page-models";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    theme: Theme;
}

export default function AdminWidget({
    settings,
    onChange,
    theme,
}: AdminWidgetProps): JSX.Element {
    const [links, setLinks] = useState(settings.links || []);
    const [linkAlignment, setLinkAlignment] = useState(
        settings.linkAlignment || defaultLinkAlignment,
    );
    const [showLoginControl, setShowLoginControl] = useState<
        boolean | undefined
    >(settings.showLoginControl || defaultShowLoginControl);
    const [linkFontWeight, setLinkFontWeight] = useState(
        settings.linkFontWeight || defaultLinkFontWeight,
    );
    const [spacingBetweenLinks, setSpacingBetweenLinks] = useState<
        number | undefined
    >(settings.spacingBetweenLinks || defaultSpacingBetweenLinks);
    const [maxWidth, setMaxWidth] = useState<
        ThemeStyle["structure"]["page"]["width"]
    >(settings.maxWidth);
    const [githubRepo, setGithubRepo] = useState<string | undefined>(
        settings.githubRepo,
    );
    const [showGithubStars, setShowGithubStars] = useState<boolean | undefined>(
        settings.showGithubStars || false,
    );

    useEffect(() => {
        onChange({
            links,
            linkAlignment,
            showLoginControl,
            linkFontWeight,
            spacingBetweenLinks,
            maxWidth,
            githubRepo,
            showGithubStars,
        });
    }, [
        links,
        linkAlignment,
        showLoginControl,
        linkFontWeight,
        spacingBetweenLinks,
        maxWidth,
        githubRepo,
        showGithubStars,
    ]);

    const onLinkChanged = (index: number, link: Link) => {
        links[index] = link;
        setLinks([...links]);
    };

    const onLinkDeleted = (index: number) => {
        links.splice(index, 1);
        setLinks([...links]);
    };

    const addNewLink = () => {
        const link: Link = {
            label: "Link",
            href: "https://courselit.app",
            id: generateUniqueId(),
        };
        setLinks([...links, link]);
    };

    return (
        <div className="flex flex-col gap-4 mb-4">
            <AdminWidgetPanel title="Links">
                <DragAndDrop
                    items={links.map((link: Link, index: number) => ({
                        link,
                        index,
                        id: link.id || generateUniqueId(),
                        onChange: onLinkChanged,
                        onDelete: onLinkDeleted,
                    }))}
                    Renderer={LinkEditor}
                    key={JSON.stringify(links)}
                    onChange={(items: any) => {
                        const newLinks = [...items.map((item) => item.link)];
                        if (
                            JSON.stringify(newLinks) !== JSON.stringify(links)
                        ) {
                            setLinks(newLinks);
                        }
                    }}
                />
                <div className="flex justify-end">
                    <Button onClick={addNewLink} fullWidth>
                        Add new link
                    </Button>
                </div>
            </AdminWidgetPanel>

            <AdminWidgetPanel title="Github Repo">
                <Form>
                    <FormField
                        label="Github Repo"
                        value={githubRepo}
                        onChange={(e) => setGithubRepo(e.target.value)}
                        placeholder="owner/repo"
                    />
                </Form>
                <div className="flex justify-between">
                    <div className="flex grow items-center gap-1">
                        <p>Show Github Stars</p>
                    </div>
                    <Checkbox
                        checked={showGithubStars}
                        onChange={(value: boolean) => setShowGithubStars(value)}
                    />
                </div>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design">
                <Select
                    title="Link font weight"
                    value={linkFontWeight}
                    options={[
                        { label: "Thin", value: "font-light" },
                        { label: "Normal", value: "font-normal" },
                        { label: "Bold", value: "font-bold" },
                    ]}
                    onChange={(
                        value: "font-light" | "font-normal" | "font-bold",
                    ) => setLinkFontWeight(value)}
                />
                <Select
                    title="Menu alignment"
                    value={linkAlignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Right", value: "right" },
                        { label: "Center", value: "center" },
                    ]}
                    onChange={(value: "left" | "right" | "center") =>
                        setLinkAlignment(value)
                    }
                />
                <PageBuilderSlider
                    title="Space between links"
                    value={spacingBetweenLinks}
                    max={64}
                    min={16}
                    onChange={setSpacingBetweenLinks}
                />
                <MaxWidthSelector
                    value={maxWidth || theme.theme.structure.page.width}
                    onChange={setMaxWidth}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Other settings">
                <div className="flex justify-between">
                    <div className="flex grow items-center gap-1">
                        <p>Show login button</p>
                        <Tooltip title="The login button, located in the top right corner, is used to access account-related links">
                            <Help />
                        </Tooltip>
                    </div>
                    <Checkbox
                        checked={showLoginControl}
                        onChange={(value: boolean) =>
                            setShowLoginControl(value)
                        }
                    />
                </div>
            </AdminWidgetPanel>
        </div>
    );
}
