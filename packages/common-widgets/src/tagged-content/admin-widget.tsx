import React, { useEffect } from "react";
import { Section } from "@courselit/components-library";
import { Grid, TextField, Typography } from "@mui/material";
import Settings from "./settings";

export interface AdminWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
}

const AdminWidget = (props: AdminWidgetProps) => {
    const { onChange, settings: settingsProps } = props;
    const [settings, setSettings] = React.useState<Settings>({
        tag: settingsProps.tag || "",
        title: settingsProps.title || "",
        subtitle: settingsProps.subtitle || "",
        backgroundColor: settingsProps.backgroundColor || "",
    });

    useEffect(() => {
        onChange(settings);
    }, [settings]);

    const onChangeData = (e: any) => {
        setSettings(
            Object.assign({}, settings, {
                [e.target.name]: e.target.value,
            })
        );
        onChange(settings);
    };

    return (
        <Section>
            <Grid container direction="column" spacing={2}>
                <Grid item xs>
                    <Typography variant="body1">
                        Display content tagged with a specific term on the top
                        section of the landing page.
                    </Typography>
                </Grid>
                <Grid item xs>
                    <Typography variant="h6">Settings</Typography>
                </Grid>
                <Grid item>
                    <TextField
                        variant="outlined"
                        label="Tag"
                        fullWidth
                        margin="normal"
                        name="tag"
                        value={settings.tag || ""}
                        onChange={onChangeData}
                        required
                    />
                    <TextField
                        variant="outlined"
                        label="Section Title"
                        fullWidth
                        margin="normal"
                        name="title"
                        value={settings.title || ""}
                        onChange={onChangeData}
                        required
                    />
                    <TextField
                        variant="outlined"
                        label="Section subtitle"
                        fullWidth
                        margin="normal"
                        name="subtitle"
                        value={settings.subtitle || ""}
                        onChange={onChangeData}
                    />
                    <TextField
                        variant="outlined"
                        label="Background color"
                        placeholder="Enter the color's HEX code"
                        fullWidth
                        margin="normal"
                        name="backgroundColor"
                        value={settings.backgroundColor || ""}
                        onChange={onChangeData}
                    />
                </Grid>
            </Grid>
        </Section>
    );
};

export default AdminWidget;
