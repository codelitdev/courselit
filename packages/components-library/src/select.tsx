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
}

interface SelectProps {
    options: Option[];
    onChange: (...args: any[]) => void;
    value: string | number;
    title: string;
}

export default function Select({
    options,
    onChange,
    value,
    title,
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
            >
                {options.map((option: Option) => (
                    <MenuItem value={option.value} key={option.value}>
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
