import React from "react";
import {
    GraphicMediaAspectRatio,
    GridGraphicType,
    GridMediaAlignment,
    GridStyle,
    Item,
    SvgStyle,
} from "../settings";
import { Alignment } from "@courselit/common-models";
import { ThemeStyle } from "@courselit/page-models";
import ItemMediaCard from "./item-mediacard";
import ItemFeatureGrid from "./item-feature-grid";
import ItemTestimonial from "./item-testimonial";
import ItemDefault from "./item-default";

export interface ItemmProps {
    item: Item;
    alignment: Alignment;
    borderRadius?: number;
    theme: ThemeStyle;
    svgStyle: SvgStyle;
    svgInline: boolean;
    style?: GridStyle;
    graphicType?: GridGraphicType;
    mediaAlignment?: GridMediaAlignment;
    graphicMediaAspectRatio?: GraphicMediaAspectRatio;
}

export default function Itemm(props: ItemmProps) {
    const { style = "default" } = props;

    switch (style) {
        case "mediacard":
            return <ItemMediaCard {...props} />;
        case "featuregrid":
            return <ItemFeatureGrid {...props} />;
        case "testimonial":
            return <ItemTestimonial {...props} />;
        case "default":
        default:
            return <ItemDefault {...props} />;
    }
}
