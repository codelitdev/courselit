import React from "react";
import { connect } from "react-redux";
import { Grid } from "@mui/material";
import WidgetByName from "./widget-by-name";
import { useRouter } from "next/router";
import widgets from "../../../../ui-config/widgets";
import State from "../../../../ui-models/state";

interface SectionProps {
    name: string;
    layout: any;
}

const Section = (props: SectionProps) => {
    const { name, layout } = props;
    const sectionLayout = layout[name];
    const router = useRouter();

    return sectionLayout && sectionLayout.length ? (
        <Grid container direction="column">
            {sectionLayout.map((item: any, index: number) =>
                widgets[item.name].metadata.excludeFromPaths &&
                widgets[item.name].metadata.excludeFromPaths.includes(
                    router.pathname
                ) ? (
                    <div key={index}></div>
                ) : (
                    <Grid item key={index}>
                        <WidgetByName
                            name={item.name}
                            section={name}
                            settings={item.settings}
                            id={`widget${item._id}`}
                        />
                    </Grid>
                )
            )}
        </Grid>
    ) : (
        <></>
    );
};

const mapStateToProps = (state: State) => ({
    layout: state.layout,
});

export default connect(mapStateToProps)(Section);
