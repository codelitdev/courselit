import React from "react";
import { Root, Thumb } from "@radix-ui/react-switch";

interface SwitchProps {
    checked: boolean;
    onChange: (...args: any[]) => void;
    style?: Record<string, string>;
}

const Switch = ({ checked: checkedProp, onChange, style }: SwitchProps) => {
    return (
        <Root
            className="w-[42px] h-[25px] rounded-full relative border-2 border-slate-300 focus:border-0 focus:shadow-[0_0_0_2px] focus:shadow-black data-[state=checked]:bg-black data-[state=checked]:border-black outline-none cursor-default"
            style={{ ...style }}
            checked={checkedProp || false}
            onCheckedChange={onChange}
        >
            <Thumb className="block w-[21px] h-[21px] bg-white rounded-full shadow-[0_2px_2px] shadow-blackA7 transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[19px]" />
        </Root>
    );
};

export default Switch;
