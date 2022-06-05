import React, { useEffect, useState } from "react";
import { OverviewAndDetail } from "@courselit/components-library";
import { WIDGETS_PAGE_HEADER } from "../../../ui-config/strings";
import widgets from "../../../ui-config/widgets";
import { connect } from "react-redux";
import { ImageListItemBar } from "@mui/material";
import { useTheme } from "@mui/material";
import { FetchBuilder } from "@courselit/utils";
import dynamic from "next/dynamic";
import type { Address, Widget } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";

const Img = dynamic(() => import("../../img"));

interface WidgetProps {
    address: Address;
}

function Widgets({ address }: WidgetProps) {
    const [componentsMap, setComponentsMap] = useState([]);
    const theme = useTheme();
    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        const map = [];
        Object.values(widgets).map((widget) => {
            Object.prototype.hasOwnProperty.call(widget, "adminWidget") &&
                map.push(getComponent(widget));
        });
        setComponentsMap(map);
    }, []);

    const getComponent = (widget: Widget) => {
        const AdminWidget = widget.adminWidget;
        const AdminWidgetWithStateAndDispatch: any = connect(
            (state: RootState) => state
        )(AdminWidget);

        return {
            subtitle: widget.metadata.displayName,
            Overview: (
                <>
                    <Img src={widget.metadata.icon} />
                    <ImageListItemBar title={widget.metadata.displayName} />
                </>
            ),
            Detail: (
                <AdminWidgetWithStateAndDispatch
                    name={widget.metadata.name}
                    fetchBuilder={fetch}
                    theme={theme}
                />
            ),
        };
    };

    return (
        <OverviewAndDetail
            title={WIDGETS_PAGE_HEADER}
            componentsMap={componentsMap}
        />
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps)(Widgets);
