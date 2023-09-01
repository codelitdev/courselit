import React, { useEffect, useState } from "react";
import Settings, { Link } from "../settings";
import LinkEditor from "./link-editor";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    Button,
} from "@courselit/components-library";

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

    useEffect(() => {
        onChange({
            links,
            logoColor,
            appBarBackground,
            loginBtnBgColor,
            loginBtnColor,
            linkColor,
            linkAlignment,
        });
    }, [
        links,
        logoColor,
        appBarBackground,
        loginBtnBgColor,
        linkColor,
        loginBtnColor,
        linkAlignment,
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
        <div className="flex flex-col">
            <div className="mb-4">
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
            </div>
            <div className="mb-4">
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
                        title="Menu alignment"
                        value={linkAlignment}
                        options={[
                            { label: "Left", value: "left" },
                            { label: "Right", value: "right" },
                        ]}
                        onChange={(value: "left" | "right") =>
                            setLinkAlignment(value)
                        }
                    />
                </AdminWidgetPanel>
            </div>
        </div>
    );
}
