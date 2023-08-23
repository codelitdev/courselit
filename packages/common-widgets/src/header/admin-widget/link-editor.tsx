import { Edit } from "@courselit/icons";
import { Grid, TextField, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";
import React, { useState } from "react";
import { Link } from "../settings";
import { Button, IconButton } from "@courselit/components-library";

interface LinkEditorProps {
    link: Link;
    index: number;
    onChange: (index: number, link: Link) => void;
    onDelete: (index: number) => void;
}
export default function LinkEditor({
    link,
    index,
    onChange,
    onDelete,
}: LinkEditorProps) {
    const [label, setLabel] = useState(link.label);
    const [href, setHref] = useState(link.href);
    const [editing, setEditing] = useState(false);

    const updateLink = () => {
        if (label && href) {
            onChange(index, {
                label,
                href,
            });
            setEditing(false);
        }
    };

    const deleteLink = () => {
        onDelete(index);
        setEditing(false);
    };

    return (
        <>
            {!editing && (
                <Grid
                    container
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                        "&:hover": {
                            backgroundColor: grey[100],
                        },
                    }}
                >
                    <Grid item>
                        <Typography>{label}</Typography>
                    </Grid>
                    <Grid item>
                        <IconButton
                            variant="soft"
                            onClick={(e) => setEditing(true)}
                        >
                            <Edit />
                        </IconButton>
                    </Grid>
                </Grid>
            )}
            {editing && (
                <Grid container direction="column">
                    <Grid item sx={{ mb: 1, mt: 1 }}>
                        <TextField
                            label="Label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <Grid item sx={{ mb: 1 }}>
                        <TextField
                            label="URL"
                            value={href}
                            onChange={(e) => setHref(e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <div className="flex gap-2 justify-end">
                        <Button
                            component="button"
                            onClick={deleteLink}
                            variant="soft"
                        >
                            Delete
                        </Button>
                        <Button onClick={updateLink} component="button">
                            Done
                        </Button>
                    </div>
                </Grid>
            )}
        </>
    );
}
