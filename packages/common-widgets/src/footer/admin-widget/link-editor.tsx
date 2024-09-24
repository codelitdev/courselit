"use client";

import React, { useState } from "react";
import { Edit } from "@courselit/icons";
import { Link } from "../settings";
import {
    Button,
    Form,
    FormField,
    IconButton,
} from "@courselit/components-library";

interface LinkEditorProps {
    link: Link;
    sectionIndex: number;
    index: number;
    onChange: (sectionIndex: number, index: number, link: Link) => void;
    onDelete: (sectionIndex: number, index: number) => void;
}

export default function LinkEditor({
    link,
    index,
    sectionIndex,
    onChange,
    onDelete,
}: LinkEditorProps) {
    const [label, setLabel] = useState(link.label);
    const [href, setHref] = useState(link.href);
    const [editing, setEditing] = useState(false);

    const updateLink = () => {
        if (label && href) {
            onChange(sectionIndex, index, {
                label,
                href,
                id: link.id,
            });
            setEditing(false);
        }
    };

    const deleteLink = () => {
        onDelete(sectionIndex, index);
        setEditing(false);
    };

    return (
        <>
            {!editing && (
                <div className="flex justify-between items-center w-full">
                    <h2>{label}</h2>
                    <IconButton variant="soft" onClick={() => setEditing(true)}>
                        <Edit />
                    </IconButton>
                </div>
            )}
            {editing && (
                <Form className="flex flex-col gap-2 mb-4">
                    <FormField
                        label="Label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                    />
                    <FormField
                        label="URL"
                        value={href}
                        onChange={(e) => setHref(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                        <Button onClick={updateLink} component="button">
                            Save
                        </Button>
                        <Button
                            component="button"
                            onClick={deleteLink}
                            variant="soft"
                        >
                            Delete
                        </Button>
                    </div>
                </Form>
            )}
        </>
    );
}
