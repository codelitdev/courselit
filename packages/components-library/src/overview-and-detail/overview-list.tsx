import * as React from "react";
import { ImageList, ImageListItem, useMediaQuery } from "@mui/material";
import ComponentProps from "./component-props";
import Section from "../section";

interface OverviewProps {
    componentsMap: ComponentProps[];
    onSelectComponentWithDetail: (index: number) => void;
    onSelectComponentWithoutDetail: (index: number) => void;
}

const OverviewList = ({
    componentsMap,
    onSelectComponentWithDetail,
    onSelectComponentWithoutDetail,
}: OverviewProps) => {
    const tablet = useMediaQuery((theme: any) => theme.breakpoints.down("md"));
    const mobile = useMediaQuery((theme: any) => theme.breakpoints.down("sm"));

    return (
        <Section>
            <ImageList cols={mobile ? 1 : tablet ? 2 : 3}>
                {componentsMap.map((component, index) => (
                    <ImageListItem
                        key={index}
                        onClick={() =>
                            "Detail" in component
                                ? onSelectComponentWithDetail(index)
                                : onSelectComponentWithoutDetail(index)
                        }
                        cols={1}
                    >
                        {component.Overview}
                    </ImageListItem>
                ))}
            </ImageList>
        </Section>
    );
};

export default OverviewList;
