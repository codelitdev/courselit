import React, { useEffect, useState } from "react";
import Settings, { Link } from "../settings";
import LinkEditor from "./link-editor";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    Button,
    Checkbox,
} from "@courselit/components-library";
import { FormField } from "@courselit/components-library";
import { Form } from "@courselit/components-library";
import { Tooltip } from "@courselit/components-library";
import { Help } from "@courselit/icons";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
}

export default function AdminWidget({ settings, onChange }: AdminWidgetProps) {
    const [links, setLinks] = useState(settings.links || []);
    const [appBarBackground, setAppBarBackground] = useState<
        string | undefined
    >(settings.appBarBackground);
    const [logoColor, setLogoColor] = useState<string | undefined>(
        settings.logoColor,
    );
    const [loginBtnBgColor, setLoginBtnBgColor] = useState<string | undefined>(
        settings.loginBtnBgColor,
    );
    const [loginBtnColor, setLoginBtnColor] = useState<string | undefined>(
        settings.loginBtnColor,
    );
    const [linkColor, setLinkColor] = useState<string | undefined>(
        settings.linkColor,
    );
    const [linkAlignment, setLinkAlignment] = useState(
        settings.linkAlignment || "left",
    );
    const [showLoginControl, setShowLoginControl] = useState<
        boolean | undefined
    >(settings.showLoginControl || true);
    const [linkFontWeight, setLinkFontWeight] = useState(
        settings.linkFontWeight || "font-normal",
    );
    const [spacingBetweenLinks, setSpacingBetweenLinks] = useState<
        number | undefined
    >(settings.spacingBetweenLinks || 16);

    useEffect(() => {
        onChange({
            links,
            logoColor,
            appBarBackground,
            loginBtnBgColor,
            loginBtnColor,
            linkColor,
            linkAlignment,
            showLoginControl,
            linkFontWeight,
            spacingBetweenLinks,
        });
    }, [
        links,
        logoColor,
        appBarBackground,
        loginBtnBgColor,
        linkColor,
        loginBtnColor,
        linkAlignment,
        showLoginControl,
        linkFontWeight,
        spacingBetweenLinks,
    ]);

    const onLinkChanged = (index: number, link: Link) => {
        links[index] = link;
        setLinks([...links]);
    };

    const onLinkDeleted = (index: number) => {
        const a = links.splice(index, 1);
        setLinks([...links]);
    };

    const addNewLink = () => {
        const link: Link = {
            label: "Link",
            href: "https://courselit.app",
        };
        setLinks([...links, link]);
    };

    return (
        <div className="flex flex-col gap-4">
                <AdminWidgetPanel title="Links">
                    {links &&
                        links.map((link, index) => (
                            <div key={`${link.label}-${link.href}-${index}`}>
                                <LinkEditor
                                    link={link}
                                    index={index}
                                    key={`${link.label}-${link.href}-${index}`}
                                    onChange={onLinkChanged}
                                    onDelete={onLinkDeleted}
                                />
                            </div>
                        ))}
                    <div className="flex justify-end">
                        <Button onClick={addNewLink} fullWidth>
                            Add new link
                        </Button>
                    </div>
                </AdminWidgetPanel>
                <AdminWidgetPanel title="Design">
                    <ColorSelector
                        title="Logo color"
                        value={logoColor || "inherit"}
                        onChange={(value?: string) => setLogoColor(value)}
                    />
                    <ColorSelector
                        title="Background color"
                        value={appBarBackground || "#eee"}
                        onChange={(value?: string) =>
                            setAppBarBackground(value)
                        }
                    />
                    <ColorSelector
                        title="Button background"
                        tooltip="Affects the login control and links that are shown as buttons"
                        value={loginBtnBgColor || ""}
                        onChange={(value?: string) => setLoginBtnBgColor(value)}
                    />
                    <ColorSelector
                        title="Button text"
                        value={loginBtnColor || "#fff"}
                        onChange={(value?: string) => setLoginBtnColor(value)}
                    />
                    <ColorSelector
                        title="Links"
                        value={linkColor || ""}
                        onChange={(value?: string) => setLinkColor(value)}
                    />
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
                    <Form
                        onSubmit={(e) => {
                            e.preventDefault();
                        }}
                    >
                        <FormField
                            label="Space between links"
                            value={spacingBetweenLinks}
                            type="number"
                            onChange={(e) =>
                                setSpacingBetweenLinks(+e.target.value)
                            }
                        />
                    </Form>
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
