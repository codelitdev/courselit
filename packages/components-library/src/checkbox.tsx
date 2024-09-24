import React from "react";
import { Indicator, Root } from "@radix-ui/react-checkbox";
import { Check } from "@courselit/icons";

interface CheckboxProps {
    checked: boolean;
    onChange: (...args: any[]) => void;
    style?: Record<string, string>;
    disabled?: boolean;
}

export default function Checkbox({
    checked,
    onChange,
    style,
    disabled,
}: CheckboxProps) {
    return (
        <Root
            className="border-2 border-slate-300 hover:bg-violet3 flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-[4px] bg-white outline-none focus:border-0 focus:shadow-[0_0_0_2px] focus:shadow-black"
            checked={checked}
            onCheckedChange={onChange}
            style={{ ...style }}
            disabled={disabled}
        >
            <Indicator className="text-black">
                <Check />
            </Indicator>
        </Root>
    );
}
