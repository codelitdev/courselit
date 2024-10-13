"use client";

import { Content, Portal, Root, Trigger } from "@radix-ui/react-popover";
import { ChangeEvent, useState } from "react";
import Form from "./form";
import IconButton from "./icon-button";
import { Cross } from "@courselit/icons";
import ScrollArea from "./scrollarea";

interface ComboBoxProps {
    options: string[];
    selectedOptions: Set<string>;
    onChange: (options: string[]) => void;
    className?: string;
    side?: "left" | "right" | "top" | "bottom";
}

export default function ComboBox({
    options,
    selectedOptions,
    onChange,
    className,
    side = "top",
}: ComboBoxProps) {
    const [internalOptions, setInternalOptions] = useState(options);
    const [internalSelectedOptions, setInternalSelectedOptions] =
        useState<Set<string>>(selectedOptions);
    const [text, setText] = useState("");
    const [internalOpen, setInternalOpen] = useState(false);
    const outlineClass = `flex flex-wrap min-w-[220px] min-h-[36px] gap-2 border border-slate-300 hover:border-slate-400 rounded py-1 px-2 outline-none focus:border-slate-600 disabled:pointer-events-none overflow-y-auto ${className}`;

    const onOptionAdd = () => {
        internalSelectedOptions.add(text);
        const selectedOptions = new Set(internalSelectedOptions);
        setInternalSelectedOptions(selectedOptions);
        onChange(Array.from(selectedOptions));
        if (!internalOptions.includes(text)) {
            setInternalOptions([...internalOptions, text]);
        }
        setText("");
    };

    return (
        <Root onOpenChange={setInternalOpen}>
            <Trigger asChild>
                <div>
                    {!internalOpen && (
                        <div className={outlineClass}>
                            {Array.from(internalSelectedOptions).map(
                                (option) => (
                                    <div
                                        key={option}
                                        className="bg-slate-300 px-2 rounded-sm"
                                    >
                                        {option}
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </Trigger>
            <Portal>
                <Content
                    align="start"
                    side={side}
                    className="bg-white shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]"
                >
                    <div className={outlineClass}>
                        {Array.from(internalSelectedOptions).map((option) => (
                            <div
                                key={option}
                                className="bg-slate-300 px-2 rounded-sm flex"
                            >
                                <div>{option}</div>
                                <IconButton
                                    variant="transparent"
                                    onClick={() => {
                                        internalSelectedOptions.delete(option);
                                        const selectedOptions = new Set(
                                            internalSelectedOptions,
                                        );
                                        setInternalSelectedOptions(
                                            selectedOptions,
                                        );
                                        onChange(
                                            Array.from(internalSelectedOptions),
                                        );
                                    }}
                                >
                                    <Cross />
                                </IconButton>
                            </div>
                        ))}
                        <Form
                            onSubmit={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onOptionAdd();
                            }}
                        >
                            <input
                                className="outline-none"
                                type="text"
                                value={text}
                                autoFocus
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setText(e.target.value)
                                }
                            />
                        </Form>
                    </div>
                    <div className="p-2">
                        <ScrollArea>
                            <h6 className="text-xs text-slate-400 my-2 font-medium">
                                Select an option or create one
                            </h6>
                            <ul>
                                {internalOptions
                                    .filter((option) => option.startsWith(text))
                                    .map((option) => (
                                        <li
                                            key={option}
                                            onClick={() => {
                                                internalSelectedOptions.add(
                                                    option,
                                                );
                                                const selectedOptions = new Set(
                                                    internalSelectedOptions,
                                                );
                                                setInternalSelectedOptions(
                                                    selectedOptions,
                                                );
                                                onChange(
                                                    Array.from(selectedOptions),
                                                );
                                            }}
                                            className="cursor-pointer text-medium leading-none rounded-[3px] flex items-center h-8 select-none outline-none hover:bg-slate-200"
                                        >
                                            {option}
                                        </li>
                                    ))}
                                {text &&
                                    !internalOptions.some(
                                        (option) => option === text,
                                    ) && (
                                        <li
                                            onClick={onOptionAdd}
                                            className="cursor-pointer text-medium leading-none rounded-[3px] flex items-center gap-2 h-8 select-none outline-none hover:bg-slate-200"
                                        >
                                            Create{" "}
                                            <span className="bg-slate-300 px-2 py-1 rounded-sm">
                                                {text}
                                            </span>
                                        </li>
                                    )}
                            </ul>
                        </ScrollArea>
                    </div>
                </Content>
            </Portal>
        </Root>
    );
}
