import { Typography } from "@mui/material";
import * as React from "react";

interface PriceTagProps {
    cost: number;
    siteInfo: any;
    freeCostCaption: string;
}

const PriceTag = (props: PriceTagProps) => {
    const cost = props.cost || 0;
    const costText =
        cost <= 0
            ? props.freeCostCaption
            : props.siteInfo.currencyUnit
            ? `${props.siteInfo.currencyUnit}${cost}`
            : `${cost} ${props.siteInfo.currencyISOCode}`;

    return <Typography variant="h5">{costText}</Typography>;
};

export default PriceTag;
