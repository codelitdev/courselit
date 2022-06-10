/**
 * A component to render a list of items which in turn have their own
 * settings.
 *
 * If an overview does not have an associated detail section then you
 * can skip the detail component.
 * This comes handy in situations where you would like to show a button
 * to perform any action.
 *
 * For example:
 *
 * componentsMap = [
 *  ... other normal components
 *  {
 *    Overview: (
 *       <Button onClick={performAction}>
 *        {"Click Me. I do not have a detail section."}
 *       </Button>
 *    )
 *  }
 * ]
 */

import * as React from "react";
import { Grid, IconButton, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import ComponentProps, { isComponentWithDetailProps } from "./component-props";
import OverviewList from "./overview-list";
import Section from "../section";

interface OverviewAndDetailProps {
    title: string;
    componentsMap: ComponentProps[];
    onSelect?: (index: number) => void;
}

const OverviewAndDetail = ({
    title,
    componentsMap,
    onSelect: onSelectFromParent,
}: OverviewAndDetailProps) => {
    const [selectedComponentIndex, setSelectedComponentIndex] =
        React.useState(-1);
    const selectedComponent = componentsMap[selectedComponentIndex];

    const onSelectComponentWithDetail = (index: number) => {
        setSelectedComponentIndex(index);
        if (onSelectFromParent) {
            onSelectFromParent(index);
        }
    };

    const onSelectComponentWithoutDetail = (index: number) => {
        if (onSelectFromParent) {
            onSelectFromParent(index);
        }
    };

    return (
        <Grid container direction="column">
            <Grid item xs={12}>
                <Section>
                    {selectedComponentIndex > -1 && (
                        <Grid item xs>
                            <Grid container alignItems="center">
                                <Grid item>
                                    <IconButton
                                        onClick={() =>
                                            setSelectedComponentIndex(-1)
                                        }
                                        size="large"
                                    >
                                        <ArrowBack />
                                    </IconButton>
                                </Grid>
                                <Grid item>
                                    <Typography variant="h1">
                                        {isComponentWithDetailProps(
                                            selectedComponent
                                        ) && selectedComponent.subtitle}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Grid>
                    )}
                    {selectedComponentIndex === -1 && (
                        <Typography variant="h1">{title}</Typography>
                    )}
                </Section>
            </Grid>
            <Grid
                item
                xs={12}
                sx={{
                    marginTop: 2,
                }}
            >
                {componentsMap.length && (
                    <>
                        {selectedComponentIndex > -1 &&
                            isComponentWithDetailProps(selectedComponent) &&
                            selectedComponent.Detail}
                        {selectedComponentIndex === -1 && (
                            <OverviewList
                                componentsMap={componentsMap}
                                onSelectComponentWithDetail={
                                    onSelectComponentWithDetail
                                }
                                onSelectComponentWithoutDetail={
                                    onSelectComponentWithoutDetail
                                }
                            />
                        )}
                    </>
                )}
            </Grid>
        </Grid>
    );
};

export default OverviewAndDetail;
