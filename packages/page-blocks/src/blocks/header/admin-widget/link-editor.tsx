import React, { useState } from "react";
import { Edit, Help } from "@courselit/icons";
import { Link } from "../settings";
import {
    Button,
    Form,
    FormField,
    IconButton,
} from "@courselit/components-library";
import { Checkbox } from "@courselit/components-library";
import { Tooltip } from "@courselit/components-library";

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
}: LinkEditorProps): JSX.Element {
    const [label, setLabel] = useState(link.label);
    const [href, setHref] = useState(link.href);
    const [isPrimary, setIsPrimary] = useState<boolean>(
        link.isPrimary || false,
    );
    const [isButton, setIsButton] = useState<boolean>(link.isButton || false);
    const [editing, setEditing] = useState(false);

    const updateLink = () => {
        if (label && href) {
            onChange(index, {
                label,
                href,
                isButton,
                isPrimary,
                id: link.id,
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
                    <div className="flex justify-between">
                        <p>Show as button</p>
                        <Checkbox
                            checked={isButton}
                            onChange={(value: boolean) => setIsButton(value)}
                        />
                    </div>
                    <div className="flex justify-between">
                        <div className="flex grow items-center gap-1">
                            <p>Primary control</p>
                            <Tooltip title="On the desktop, this link appears in the right corner">
                                <Help />
                            </Tooltip>
                        </div>
                        <Checkbox
                            checked={isPrimary}
                            onChange={(value: boolean) => setIsPrimary(value)}
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button
                            component="button"
                            onClick={deleteLink}
                            variant="soft"
                        >
                            Delete
                        </Button>
                        <Button onClick={updateLink} component="button">
                            Save
                        </Button>
                    </div>
                </Form>
            )}
        </>
    );
}
