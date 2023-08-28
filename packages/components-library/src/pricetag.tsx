import * as React from "react";
import getSymbolFromCurrency from "currency-symbol-map";

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

    return <div className="font-medium">{costText}</div>;
};

export default PriceTag;
