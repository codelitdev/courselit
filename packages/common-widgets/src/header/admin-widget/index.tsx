import React, { ChangeEvent, useEffect, useState } from "react";
import { Button, Grid } from "@mui/material";
import Settings, { Link } from "../settings";
import LinkEditor from "./link-editor";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
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
        <Grid container direction="column">
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Links">
                    {links &&
                        links.map((link, index) => (
                            <Grid
                                item
                                key={`${link.label}-${link.href}-${index}`}
                            >
                                <LinkEditor
                                    link={link}
                                    index={index}
                                    key={`${link.label}-${link.href}-${index}`}
                                    onChange={onLinkChanged}
                                    onDelete={onLinkDeleted}
                                />
                            </Grid>
                        ))}
                    <Grid item sx={{ mt: 1 }}>
                        <Button onClick={addNewLink} fullWidth>
                            Add new link
                        </Button>
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Design">
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Logo color"
                            value={logoColor || "inherit"}
                            onChange={(value?: string) => setLogoColor(value)}
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Background color"
                            value={appBarBackground || "#eee"}
                            onChange={(value?: string) =>
                                setAppBarBackground(value)
                            }
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Button background"
                            value={loginBtnBgColor || ""}
                            onChange={(value?: string) =>
                                setLoginBtnBgColor(value)
                            }
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Button text"
                            value={loginBtnColor || "#fff"}
                            onChange={(value?: string) =>
                                setLoginBtnColor(value)
                            }
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Links"
                            value={linkColor || ""}
                            onChange={(value?: string) => setLinkColor(value)}
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
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
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
        </Grid>
    );
}
