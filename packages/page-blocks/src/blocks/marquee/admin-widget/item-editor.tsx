import React from "react";
import {
    Button,
    FormField,
    Form,
    Tooltip,
    Textarea,
} from "@courselit/components-library";
import { Item } from "../settings";
import { ChangeEvent, useState } from "react";
import { Lightbulb } from "lucide-react";

export default function ItemEditor({
    item,
    index,
    onChange,
    onDelete,
}: {
    item: Item;
    index: number;
    onChange: (item: Item) => void;
    onDelete: () => void;
}) {
    const [text, setText] = useState(item.text);
    const [svgText, setSvgText] = useState(item.svgText);
    const [href, setHref] = useState(item.href);

    const itemChanged = () =>
        onChange({
            text,
            svgText,
            href,
        });

    return (
        <div className="flex flex-col">
            <Form
                className="flex flex-col gap-4"
                onSubmit={(e) => e.preventDefault()}
            >
                <FormField
                    label="Text"
                    value={text}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setText(e.target.value)
                    }
                />
                <div className="flex items-center gap-4 my-1">
                    <hr className="flex-grow border-t border-gray-300" />
                    <span className="text-gray-500 text-sm font-medium">
                        OR
                    </span>
                    <hr className="flex-grow border-t border-gray-300" />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="mb-1 font-semibold">Icon</label>
                    <Textarea
                        placeholder="Enter SVG text here"
                        className="min-h-[150px] font-mono text-sm mb-4"
                        value={svgText}
                        rows={10}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                            setSvgText(e.target.value)
                        }
                    />
                    <div>
                        <p className="font-semibold text-sm">Icon preview</p>
                        <div
                            className="w-[100px] h-[60px] flex items-center justify-center"
                            dangerouslySetInnerHTML={{ __html: svgText }}
                        />
                    </div>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Lightbulb className="w-4 h-4" />
                    <p>
                        If you use the icon option, the text option will be
                        ignored.
                    </p>
                </div>
                <FormField
                    label="Link"
                    tooltip="Optional link for the item"
                    value={href}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setHref(e.target.value)
                    }
                />
            </Form>
            <div className="flex justify-between">
                <Tooltip title="Delete">
                    <Button
                        component="button"
                        onClick={onDelete}
                        variant="soft"
                    >
                        Delete
                    </Button>
                </Tooltip>
                <Tooltip title="Go back">
                    <Button component="button" onClick={itemChanged}>
                        Done
                    </Button>
                </Tooltip>
            </div>
        </div>
    );
}
