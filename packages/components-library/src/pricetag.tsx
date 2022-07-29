import { Typography } from "@mui/material";
import * as React from "react";

interface PriceTagProps {
    cost: number;
    freeCostCaption: string;
    currencyUnit?: string;
    currencyISOCode: string;
}

const PriceTag = (props: PriceTagProps) => {
    const cost = props.cost || 0;
    const costText =
        cost <= 0
            ? props.freeCostCaption
            : props.currencyUnit
            ? `${props.currencyUnit}${cost}`
            : `${cost} ${props.currencyISOCode}`;

    return <Typography variant="caption">{costText}</Typography>;
};

export default PriceTag;
