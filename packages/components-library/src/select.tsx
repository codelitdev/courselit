import * as React from "react";
import {
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select as SingleSelect,
    Typography,
} from "@mui/material";

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
        <FormControl fullWidth>
            <InputLabel id={`${id}-label`}>{title}</InputLabel>
            <SingleSelect
                labelId={`${id}-label`}
                id={`${id}-select`}
                value={value}
                label={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onChange(e.target.value)
                }
                disabled={disabled}
            >
                {options.map((option: Option) => (
                    <MenuItem
                        value={option.value}
                        key={option.value}
                        disabled={option.disabled || false}
                    >
                        <Grid container direction="column">
                            <Grid item>{option.label}</Grid>
                            {option.sublabel && (
                                <Grid item>
                                    <Typography
                                        variant="body2"
                                        color="textSecondary"
                                    >
                                        {option.sublabel}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </MenuItem>
                ))}
            </SingleSelect>
        </FormControl>
    );
}
