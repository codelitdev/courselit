import * as React from "react";
import { Typography } from "@mui/material";
import getSymbolFromCurrency = require("currency-symbol-map");

interface PriceTagProps {
    cost: number;
    freeCostCaption: string;
    currencyISOCode: string;
}

const PriceTag = (props: PriceTagProps) => {
    const cost = props.cost || 0;
    const costText =
        cost <= 0
            ? props.freeCostCaption
            : `${
                  getSymbolFromCurrency(props.currencyISOCode.toUpperCase()) ||
                  props.currencyISOCode.toUpperCase() + " "
              }${cost}`;

    return (
        <Typography variant="subtitle1" sx={{ fontWeight: "bolder" }}>
            {costText}
        </Typography>
    );
};

export default PriceTag;
