import React, { ChangeEvent, useEffect, useState } from "react";
import {
    Button,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from "@mui/material";
import Settings, { Link } from "../settings";
import LinkEditor from "./link-editor";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
}

export default function AdminWidget({ settings, onChange }: AdminWidgetProps) {
    const [links, setLinks] = useState(settings.links || []);
    const [appBarBackground, setAppBarBackground] = useState(
        settings.appBarBackground || "#eee"
    );
    const [logoColor, setLogoColor] = useState(settings.logoColor || "");
    const [loginBtnBgColor, setLoginBtnBgColor] = useState(
        settings.loginBtnBgColor || ""
    );
    const [loginBtnColor, setLoginBtnColor] = useState(
        settings.loginBtnColor || "#fff"
    );
    const [linkColor, setLinkColor] = useState(settings.linkColor || "");
    const [linkAlignment, setLinkAlignment] = useState(
        settings.linkAlignment || "left"
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
            <Grid item sx={{ mb: 2 }}>
                <Typography
                    variant="subtitle1"
                    sx={{ mb: 1 }}
                    fontWeight="bolder"
                >
                    Links
                </Typography>
                {links &&
                    links.map((link, index) => (
                        <LinkEditor
                            link={link}
                            index={index}
                            key={`${link.label}-${link.href}-${index}`}
                            onChange={onLinkChanged}
                            onDelete={onLinkDeleted}
                        />
                    ))}
                <Button onClick={addNewLink} fullWidth>
                    Add new link
                </Button>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">Logo color</Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={logoColor}
                            onChange={(e) => setLogoColor(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">
                            Background color
                        </Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={appBarBackground}
                            onChange={(e) =>
                                setAppBarBackground(
                                    e.target.value as `#${string}`
                                )
                            }
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">
                            Button background
                        </Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={loginBtnBgColor}
                            onChange={(e) => setLoginBtnBgColor(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">Button text</Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={loginBtnColor}
                            onChange={(e) =>
                                setLoginBtnColor(e.target.value as `#${string}`)
                            }
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">Links</Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={linkColor}
                            onChange={(e) => setLinkColor(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <FormControl fullWidth>
                    <InputLabel id="menu-alingment-label">
                        Menu alingment
                    </InputLabel>
                    <Select
                        labelId="menu-alignment-label"
                        id="menu-alingment-select"
                        value={linkAlignment}
                        label="Menu alignment"
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setLinkAlignment(e.target.value as "left" | "right")
                        }
                    >
                        <MenuItem value="left">Left</MenuItem>
                        <MenuItem value="right">Right</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
        </Grid>
    );
}
