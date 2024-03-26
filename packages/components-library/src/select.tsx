import { Dot, ExpandMore, Info } from "@courselit/icons";
import {
    Root,
    Trigger,
    Portal,
    Content,
    RadioGroup,
    RadioItem,
    ItemIndicator,
    Arrow,
} from "@radix-ui/react-dropdown-menu";
import Tooltip from "./tooltip";
import ScrollArea from "./scrollarea";

interface Option {
    label: string;
    value: string | number;
    sublabel?: string;
    disabled?: boolean;
}

interface SelectProps {
    options: Option[];
    onChange: (...args: any[]) => void;
    value: string | number;
    title: string;
    subtitle?: string;
    disabled?: boolean;
    defaultMessage?: string;
    variant?: "with-label" | "without-label";
}

export default function Select({
    options,
    onChange,
    value,
    title,
    subtitle,
    disabled,
    variant = "with-label",
}: SelectProps) {
    return (
        <Root>
            <Trigger disabled={disabled} asChild>
                <div className="cursor-pointer">
                    {variant !== "without-label" && (
                        <div className="mb-1 font-medium">{title}</div>
                    )}
                    <div className="flex justify-between items-center gap-2 border border-slate-300 hover:border-slate-400 rounded py-1 px-2 outline-none focus:border-slate-600 disabled:pointer-events-none">
                        {options.filter((x) => x.value === value)[0]?.label}
                        <ExpandMore />
                    </div>
                </div>
            </Trigger>
            <Portal>
                <Content className="min-w-[180px] bg-white rounded shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]">
                    {(subtitle || variant === "without-label") && (
                        <div className="mb-2 px-2">
                            {variant === "without-label" && (
                                <div className="font-medium mb-1">{title}</div>
                            )}
                            {subtitle && (
                                <div className="text-sm text-slate-500">
                                    {subtitle}
                                </div>
                            )}
                        </div>
                    )}
                    <ScrollArea>
                        <RadioGroup
                            value={value as string}
                            onValueChange={onChange}
                        >
                            {options.map((option: Option) => (
                                <RadioItem
                                    value={option.value as string}
                                    key={option.value}
                                    disabled={option.disabled || false}
                                    className="text-medium leading-none rounded-[3px] flex items-center h-8 px-2 py-2 relative pl-6 select-none outline-none data-[disabled]:text-slate-200 data-[disabled]:pointer-events-none hover:bg-slate-200"
                                >
                                    <ItemIndicator className="absolute left-0 w-[25px] inline-flex items-center justify-center">
                                        <Dot />
                                    </ItemIndicator>
                                    <div className="w-full flex items-center justify-between">
                                        <div>{option.label}</div>
                                        {option.sublabel && (
                                            <div className="text-sm text-slate-500">
                                                <Tooltip
                                                    title={option.sublabel}
                                                >
                                                    <Info />
                                                </Tooltip>
                                            </div>
                                        )}
                                    </div>
                                </RadioItem>
                            ))}
                        </RadioGroup>
                        <Arrow className="border-slate-300 fill-white" />
                    </ScrollArea>
                </Content>
            </Portal>
        </Root>
    );

    // return (
    //     <div className="flex flex-col">
    //         <label htmlFor="select" className="mb-1 font-medium">
    //             {title}
    //         </label>
    //         <select
    //             id="select"
    //             value={value}
    //             onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
    //                 onChange(e.target.value)
    //             }
    //             disabled={disabled}
    //             className="border border-slate-300 hover:border-slate-400 py-1 px-2 rounded"
    //         >
    //             {defaultMessage && (
    //                 <option disabled selected value="">
    //                     {" "}
    //                     {defaultMessage}{" "}
    //                 </option>
    //             )}
    //             {options.map((option: Option) => (
    //                 <option
    //                     value={option.value}
    //                     key={option.value}
    //                     disabled={option.disabled || false}
    //                     className="p-2"
    //                 >
    //                     {option.label}{" "}
    //                     {option.sublabel ? `(${option.sublabel})` : ""}
    //                 </option>
    //             ))}
    //         </select>
    //     </div>
    // );
}
