import React, { useEffect, useState } from "react";
import { Button, Grid, TextField } from "@mui/material";
import Settings, { Link } from "../settings";
import LinkEditor from "./link-editor";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
}

export default function AdminWidget({ settings, onChange }: AdminWidgetProps) {
    console.log("header", settings);
    const [links, setLinks] = useState(settings.links || []);

    useEffect(() => {
        onChange({
            links,
        });
    }, [links]);

    const onLinkChanged = (index: number, link: Link) => {};

    const addNewLink = () => {
        const link: Link = {
            label: "Link",
            href: "https://courselit.app",
        };
        setLinks([...links, link]);
    };

    return (
        <Grid container>
            <Grid item>
                {links &&
                    links.map((link, index) => (
                        <LinkEditor
                            link={link}
                            onChange={onLinkChanged}
                            index={index}
                        />
                    ))}
                <Button onClick={addNewLink}>Add new link</Button>
            </Grid>
        </Grid>
    );
}
