import * as React from "react";
import { GridList, GridListTile, useMediaQuery } from "@material-ui/core";
import ComponentProps from "./ComponentProps";
import Section from "../Section";

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
  const tablet = useMediaQuery((theme: any) => theme.breakpoints.down("sm"));
  const mobile = useMediaQuery((theme: any) => theme.breakpoints.down("xs"));

  return (
    <Section>
      <GridList cols={mobile ? 1 : tablet ? 2 : 3}>
        {componentsMap.map((component, index) => (
          <GridListTile
            key={index}
            onClick={() =>
              "Detail" in component
                ? onSelectComponentWithDetail(index)
                : onSelectComponentWithoutDetail(index)
            }
            cols={1}
          >
            {component.Overview}
          </GridListTile>
        ))}
      </GridList>
    </Section>
  );
};

export default OverviewList;
