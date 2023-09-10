import React, { useState } from "react";
import { Edit } from "@courselit/icons";
import { Link } from "../settings";
import {
    Button,
    Form,
    FormField,
    IconButton,
    Section,
} from "@courselit/components-library";

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
                <div className="flex justify-between items-center">
                    <h2>{label}</h2>
                    <IconButton
                        variant="soft"
                        onClick={(e) => setEditing(true)}
                    >
                        <Edit />
                    </IconButton>
                </div>
            )}
            {editing && (
                <Form className="flex flex-col">
                    <FormField
                        label="Label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="mb-2"
                    />
                    <FormField
                        label="URL"
                        value={href}
                        onChange={(e) => setHref(e.target.value)}
                        className="mb-2"
                    />
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
                </Form>
            )}
        </>
    );
}
