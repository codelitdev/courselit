import { Typography } from "@mui/material";
import React, { useState } from "react";
import { Link } from "../settings";

interface LinkEditorProps {
    link: Link;
    index: number;
    onChange: (index: number, link: Link) => void;
}
export default function LinkEditor({ link, index, onChange }: LinkEditorProps) {
    const [editing, setEditing] = useState(false);

    return <Typography>Hehe</Typography>;
}
