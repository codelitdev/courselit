import * as React from "react";
import { GridList, GridListTile, useMediaQuery } from "@material-ui/core";
import ComponentProps from "./ComponentProps";

interface OverviewProps {
  componentsMap: ComponentProps[];
  onSelect: (index: number) => void;
}

const OverviewList = ({ componentsMap, onSelect }: OverviewProps) => {
  const tablet = useMediaQuery((theme: any) => theme.breakpoints.down("sm"));
  const mobile = useMediaQuery((theme: any) => theme.breakpoints.down("xs"));

  return (
    <GridList cols={mobile ? 1 : tablet ? 2 : 3}>
      {componentsMap.map((component, index) => (
        <GridListTile
          key={index}
          onClick={() => ("Detail" in component ? onSelect(index) : null)}
          cols={1}
        >
          {component.Overview}
        </GridListTile>
      ))}
    </GridList>
  );
};

export default OverviewList;
