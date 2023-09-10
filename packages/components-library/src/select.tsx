import * as React from "react";

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
    disabled?: boolean;
}

export default function Select({
    options,
    onChange,
    value,
    title,
    disabled,
}: SelectProps) {
    const id = `${title.split(" ").join().toLowerCase()}`;

    return (
        <div className="flex flex-col">
            <label htmlFor="select" className="mb-1 font-medium">
                {title}
            </label>
            <select
                id="select"
                value={value}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    onChange(e.target.value)
                }
                disabled={disabled}
                className="border border-slate-300 hover:border-slate-400 py-1 px-2 rounded"
            >
                {options.map((option: Option) => (
                    <option
                        value={option.value}
                        key={option.value}
                        disabled={option.disabled || false}
                        className="p-2"
                    >
                        {option.label}{" "}
                        {option.sublabel ? `(${option.sublabel})` : ""}
                    </option>
                ))}
            </select>
        </div>
    );
}
